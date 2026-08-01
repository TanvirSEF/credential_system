"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { vaults, vaultKeyEnvelopes, credentialTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  const masterEnvelope: KeyEnvelope | null = masterEnvelopeRecord
    ? {
        wrappedKey: masterEnvelopeRecord.wrappedKey,
        iv: masterEnvelopeRecord.iv,
        salt: masterEnvelopeRecord.kdfSalt,
        kdfName: "pbkdf2",
        kdfParams: {
          name: "pbkdf2",
          salt: masterEnvelopeRecord.kdfSalt,
          iterations: masterEnvelopeRecord.kdfIterations,
          hash: "SHA-256",
        },
        cryptoVersion: masterEnvelopeRecord.cryptoVersion,
      }
    : null;

  const recoveryEnvelope: KeyEnvelope | null = recoveryEnvelopeRecord
    ? {
        wrappedKey: recoveryEnvelopeRecord.wrappedKey,
        iv: recoveryEnvelopeRecord.iv,
        salt: recoveryEnvelopeRecord.kdfSalt,
        kdfName: "pbkdf2",
        kdfParams: {
          name: "pbkdf2",
          salt: recoveryEnvelopeRecord.kdfSalt,
          iterations: recoveryEnvelopeRecord.kdfIterations,
          hash: "SHA-256",
        },
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
      kdfSalt: payload.masterEnvelope.salt,
      kdfIterations: payload.masterEnvelope.kdfParams.iterations,
      cryptoVersion: 1,
    },
    {
      vaultId: newVault.id,
      ownerId: user.id,
      envelopeType: "recovery",
      wrappedKey: payload.recoveryEnvelope.wrappedKey,
      iv: payload.recoveryEnvelope.iv,
      kdfSalt: payload.recoveryEnvelope.salt,
      kdfIterations: payload.recoveryEnvelope.kdfParams.iterations,
      cryptoVersion: 1,
    },
  ]);

  if (payload.defaultTypes.length > 0) {
    await db.insert(credentialTypes).values(
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

  return { success: true, vaultId: newVault.id };
}
