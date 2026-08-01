"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { credentialTypes, vaultKeyEnvelopes, vaults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KeyEnvelope } from "@/lib/crypto/types";

export async function getUserVaultStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authenticated: false, hasVault: false, masterEnvelope: null, vaultId: null };
  }

  const userVaults = await db
    .select()
    .from(vaults)
    .where(eq(vaults.ownerId, user.id))
    .limit(1);

  if (userVaults.length === 0) {
    return { authenticated: true, user, hasVault: false, masterEnvelope: null, vaultId: null };
  }

  const userVault = userVaults[0];
  const envelopes = await db
    .select()
    .from(vaultKeyEnvelopes)
    .where(eq(vaultKeyEnvelopes.vaultId, userVault.id));

  const masterEnvelopeRecord = envelopes.find((e) => e.envelopeType === "master");
  const recoveryEnvelopeRecord = envelopes.find((e) => e.envelopeType === "recovery");

  const masterEnvelope: KeyEnvelope | null = masterEnvelopeRecord
    ? {
        wrappedKey: masterEnvelopeRecord.wrappedKey,
        iv: masterEnvelopeRecord.iv,
        salt: masterEnvelopeRecord.salt,
        kdfName: masterEnvelopeRecord.kdfName,
        kdfParams: masterEnvelopeRecord.kdfParams as any,
        verificationCiphertext: masterEnvelopeRecord.verificationCiphertext || undefined,
        verificationIv: masterEnvelopeRecord.verificationIv || undefined,
        cryptoVersion: masterEnvelopeRecord.cryptoVersion,
      }
    : null;

  const recoveryEnvelope: KeyEnvelope | null = recoveryEnvelopeRecord
    ? {
        wrappedKey: recoveryEnvelopeRecord.wrappedKey,
        iv: recoveryEnvelopeRecord.iv,
        salt: recoveryEnvelopeRecord.salt,
        kdfName: recoveryEnvelopeRecord.kdfName,
        kdfParams: recoveryEnvelopeRecord.kdfParams as any,
        cryptoVersion: recoveryEnvelopeRecord.cryptoVersion,
      }
    : null;

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

  const newVaultList = await db
    .insert(vaults)
    .values({
      ownerId: user.id,
      nameCiphertext: payload.nameCiphertext,
      nameIv: payload.nameIv,
      cryptoVersion: 1,
    })
    .returning();

  const newVault = newVaultList[0];

  await db.insert(vaultKeyEnvelopes).values([
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
      cryptoVersion: payload.masterEnvelope.cryptoVersion,
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
      cryptoVersion: payload.recoveryEnvelope.cryptoVersion,
    },
  ]);

  if (payload.defaultTypes.length > 0) {
    await db.insert(credentialTypes).values(
      payload.defaultTypes.map((t) => ({
        vaultId: newVault.id,
        ownerId: user.id,
        payloadCiphertext: t.payloadCiphertext,
        iv: t.iv,
        sortOrder: t.sortOrder,
        cryptoVersion: 1,
        schemaVersion: 1,
      }))
    );
  }

  return { success: true, vaultId: newVault.id };
}
