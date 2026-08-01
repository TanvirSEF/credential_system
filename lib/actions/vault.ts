"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { vaults, vaultKeyEnvelopes, credentialTypes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { KeyEnvelope } from "@/lib/crypto/types";

export async function getUserVaultStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authenticated: false, hasVault: false };
  }

  const userVaults = await db
    .select()
    .from(vaults)
    .where(eq(vaults.ownerId, user.id));

  if (userVaults.length === 0) {
    return { authenticated: true, user, hasVault: false };
  }

  const userVault = userVaults[0];

  const envelopes = await db
    .select()
    .from(vaultKeyEnvelopes)
    .where(eq(vaultKeyEnvelopes.vaultId, userVault.id));

  const masterEnvelopeRecord = envelopes.find((e) => e.envelopeType === "master");
  const recoveryEnvelopeRecord = envelopes.find((e) => e.envelopeType === "recovery");

  if (!masterEnvelopeRecord) {
    return { authenticated: true, user, hasVault: false };
  }

  const masterEnvelope: KeyEnvelope = {
    wrappedKey: masterEnvelopeRecord.wrappedKey,
    iv: masterEnvelopeRecord.iv,
    salt: masterEnvelopeRecord.salt,
    kdfName: masterEnvelopeRecord.kdfName as any,
    kdfParams: masterEnvelopeRecord.kdfParams as any,
    verificationCiphertext: masterEnvelopeRecord.verificationCiphertext || undefined,
    verificationIv: masterEnvelopeRecord.verificationIv || undefined,
    cryptoVersion: masterEnvelopeRecord.cryptoVersion,
  };

  const recoveryEnvelope: KeyEnvelope | undefined = recoveryEnvelopeRecord
    ? {
        wrappedKey: recoveryEnvelopeRecord.wrappedKey,
        iv: recoveryEnvelopeRecord.iv,
        salt: recoveryEnvelopeRecord.salt,
        kdfName: recoveryEnvelopeRecord.kdfName as any,
        kdfParams: recoveryEnvelopeRecord.kdfParams as any,
        verificationCiphertext: recoveryEnvelopeRecord.verificationCiphertext || undefined,
        verificationIv: recoveryEnvelopeRecord.verificationIv || undefined,
        cryptoVersion: recoveryEnvelopeRecord.cryptoVersion,
      }
    : undefined;

  return {
    authenticated: true,
    user,
    hasVault: true,
    vaultId: userVault.id,
    masterEnvelope,
    recoveryEnvelope,
  };
}

export async function createVaultAndEnvelopesAction(payload: {
  nameCiphertext: string;
  nameIv: string;
  masterEnvelope: KeyEnvelope;
  recoveryEnvelope: KeyEnvelope;
  defaultTypes: Array<{
    payloadCiphertext: string;
    iv: string;
    sortOrder: number;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated." };
  }

  const existingVaults = await db
    .select({ id: vaults.id })
    .from(vaults)
    .where(eq(vaults.ownerId, user.id));

  if (existingVaults.length > 0) {
    const completeVault = await db
      .select({ id: vaultKeyEnvelopes.id })
      .from(vaultKeyEnvelopes)
      .where(
        and(
          inArray(vaultKeyEnvelopes.vaultId, existingVaults.map((v) => v.id)),
          eq(vaultKeyEnvelopes.envelopeType, "master")
        )
      );

    if (completeVault.length > 0) {
      return { error: "A vault already exists for this account. Sign in and unlock it instead." };
    }
  }

  const newVaultId = await db.transaction(async (tx) => {
    await tx.delete(vaults).where(eq(vaults.ownerId, user.id));

    const [newVault] = await tx
      .insert(vaults)
      .values({
        ownerId: user.id,
        nameCiphertext: payload.nameCiphertext,
        nameIv: payload.nameIv,
        cryptoVersion: 1,
      })
      .returning({ id: vaults.id });

    await tx.insert(vaultKeyEnvelopes).values([
      {
        vaultId: newVault.id,
        ownerId: user.id,
        envelopeType: "master",
        wrappedKey: payload.masterEnvelope.wrappedKey,
        iv: payload.masterEnvelope.iv,
        salt: payload.masterEnvelope.salt,
        kdfName: payload.masterEnvelope.kdfName,
        kdfParams: payload.masterEnvelope.kdfParams,
        verificationCiphertext: payload.masterEnvelope.verificationCiphertext,
        verificationIv: payload.masterEnvelope.verificationIv,
        cryptoVersion: 1,
      },
      {
        vaultId: newVault.id,
        ownerId: user.id,
        envelopeType: "recovery",
        wrappedKey: payload.recoveryEnvelope.wrappedKey,
        iv: payload.recoveryEnvelope.iv,
        salt: payload.recoveryEnvelope.salt,
        kdfName: payload.recoveryEnvelope.kdfName,
        kdfParams: payload.recoveryEnvelope.kdfParams,
        verificationCiphertext: payload.recoveryEnvelope.verificationCiphertext,
        verificationIv: payload.recoveryEnvelope.verificationIv,
        cryptoVersion: 1,
      },
    ]);

    if (payload.defaultTypes.length > 0) {
      await tx.insert(credentialTypes).values(
        payload.defaultTypes.map((dt) => ({
          vaultId: newVault.id,
          ownerId: user.id,
          payloadCiphertext: dt.payloadCiphertext,
          iv: dt.iv,
          sortOrder: dt.sortOrder,
          cryptoVersion: 1,
          schemaVersion: 1,
        }))
      );
    }

    return newVault.id;
  });

  return { success: true, vaultId: newVaultId };
}
