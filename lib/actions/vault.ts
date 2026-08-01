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

  // If envelopes are missing due to a previous partial setup error, clean up the incomplete vault so the user can complete Setup Wizard freshly
  if (!masterEnvelopeRecord || !recoveryEnvelopeRecord) {
    await db.delete(vaults).where(eq(vaults.id, userVault.id));
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

  const recoveryEnvelope: KeyEnvelope = {
    wrappedKey: recoveryEnvelopeRecord.wrappedKey,
    iv: recoveryEnvelopeRecord.iv,
    salt: recoveryEnvelopeRecord.salt,
    kdfName: recoveryEnvelopeRecord.kdfName as any,
    kdfParams: recoveryEnvelopeRecord.kdfParams as any,
    verificationCiphertext: recoveryEnvelopeRecord.verificationCiphertext || undefined,
    verificationIv: recoveryEnvelopeRecord.verificationIv || undefined,
    cryptoVersion: recoveryEnvelopeRecord.cryptoVersion,
  };

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

  // Ensure any orphaned incomplete vault for this user is deleted before creating new vault
  await db.delete(vaults).where(eq(vaults.ownerId, user.id));

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
