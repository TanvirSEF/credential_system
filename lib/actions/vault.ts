"use server"

import { createClient } from "@/lib/supabase/server"
import { vaults, vaultKeyEnvelopes, credentialTypes } from "@/db/schema"
import { eq, and, gte, lt } from "drizzle-orm"
import { withRls } from "@/db/rls"
import { KeyEnvelope, KdfParams } from "@/lib/crypto/types"
import {
  MAX_DEFAULT_CREDENTIAL_TYPES,
  isUuid,
  validateEncryptedPayload,
  validateKeyEnvelope,
} from "./validation"

function envelopeUpdateValues(envelope: KeyEnvelope) {
  return {
    wrappedKey: envelope.wrappedKey,
    iv: envelope.iv,
    salt: envelope.salt,
    kdfName: envelope.kdfName,
    kdfParams: envelope.kdfParams,
    verificationCiphertext: envelope.verificationCiphertext || null,
    verificationIv: envelope.verificationIv || null,
    cryptoVersion: envelope.cryptoVersion,
    updatedAt: new Date(),
  }
}

function parseExpectedTimestamp(value: unknown) {
  if (typeof value !== "string") return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function getUserVaultStatus() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authenticated: false, hasVault: false }
  }

  let data
  try {
    data = await withRls(user.id, async (tx) => {
      const userVaults = await tx
        .select()
        .from(vaults)
        .where(eq(vaults.ownerId, user.id))

      if (userVaults.length === 0) return null

      const userVault = userVaults[0]
      const envelopes = await tx
        .select()
        .from(vaultKeyEnvelopes)
        .where(eq(vaultKeyEnvelopes.vaultId, userVault.id))

      return { userVault, envelopes }
    })
  } catch (error) {
    console.error("Vault database status check failed:", error)
    return {
      authenticated: true,
      hasVault: false,
      error:
        "The vault database is unavailable. Check DATABASE_URL and database authorization settings.",
    } as const
  }

  if (!data) {
    return { authenticated: true, user, hasVault: false }
  }

  const { userVault, envelopes } = data

  const masterEnvelopeRecord = envelopes.find(
    (e) => e.envelopeType === "master"
  )
  const recoveryEnvelopeRecord = envelopes.find(
    (e) => e.envelopeType === "recovery"
  )

  if (!masterEnvelopeRecord) {
    return { authenticated: true, user, hasVault: false }
  }

  const masterEnvelope: KeyEnvelope = {
    wrappedKey: masterEnvelopeRecord.wrappedKey,
    iv: masterEnvelopeRecord.iv,
    salt: masterEnvelopeRecord.salt,
    kdfName: masterEnvelopeRecord.kdfName,
    kdfParams: masterEnvelopeRecord.kdfParams as KdfParams,
    verificationCiphertext:
      masterEnvelopeRecord.verificationCiphertext || undefined,
    verificationIv: masterEnvelopeRecord.verificationIv || undefined,
    cryptoVersion: masterEnvelopeRecord.cryptoVersion,
  }

  const recoveryEnvelope: KeyEnvelope | undefined = recoveryEnvelopeRecord
    ? {
        wrappedKey: recoveryEnvelopeRecord.wrappedKey,
        iv: recoveryEnvelopeRecord.iv,
        salt: recoveryEnvelopeRecord.salt,
        kdfName: recoveryEnvelopeRecord.kdfName,
        kdfParams: recoveryEnvelopeRecord.kdfParams as KdfParams,
        verificationCiphertext:
          recoveryEnvelopeRecord.verificationCiphertext || undefined,
        verificationIv: recoveryEnvelopeRecord.verificationIv || undefined,
        cryptoVersion: recoveryEnvelopeRecord.cryptoVersion,
      }
    : undefined

  return {
    authenticated: true,
    user,
    hasVault: true,
    vaultId: userVault.id,
    masterEnvelope,
    recoveryEnvelope,
    masterEnvelopeUpdatedAt: masterEnvelopeRecord.updatedAt.toISOString(),
    recoveryEnvelopeUpdatedAt: recoveryEnvelopeRecord?.updatedAt.toISOString(),
  }
}

export async function rotateRecoveryEnvelopeAction(payload: {
  vaultId: string
  expectedUpdatedAt: string
  recoveryEnvelope: KeyEnvelope
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "User not authenticated." }
  if (!isUuid(payload.vaultId)) return { error: "Vault ID is invalid." }
  const expectedUpdatedAt = parseExpectedTimestamp(payload.expectedUpdatedAt)
  if (!expectedUpdatedAt) {
    return { error: "Recovery state is stale. Refresh and try again." }
  }
  const envelopeError = validateKeyEnvelope(
    payload.recoveryEnvelope,
    "Recovery envelope"
  )
  if (envelopeError) return { error: envelopeError }

  try {
    const result = await withRls(user.id, async (tx) => {
      const updated = await tx
        .update(vaultKeyEnvelopes)
        .set(envelopeUpdateValues(payload.recoveryEnvelope))
        .where(
          and(
            eq(vaultKeyEnvelopes.vaultId, payload.vaultId),
            eq(vaultKeyEnvelopes.ownerId, user.id),
            eq(vaultKeyEnvelopes.envelopeType, "recovery"),
            gte(vaultKeyEnvelopes.updatedAt, expectedUpdatedAt),
            lt(vaultKeyEnvelopes.updatedAt, new Date(expectedUpdatedAt.getTime() + 1))
          )
        )
        .returning({ updatedAt: vaultKeyEnvelopes.updatedAt })

      if (updated.length !== 1) throw new Error("RECOVERY_CONFLICT")
      return updated[0]
    })

    return { success: true, updatedAt: result.updatedAt.toISOString() }
  } catch (error) {
    if (error instanceof Error && error.message === "RECOVERY_CONFLICT") {
      return {
        error:
          "Recovery settings changed in another session. Reopen this dialog and try again.",
      }
    }
    console.error("Recovery envelope rotation failed:", error)
    return {
      error: "Could not replace the recovery key. The old key is still active.",
    }
  }
}

export async function recoverVaultAccessAction(payload: {
  vaultId: string
  expectedMasterUpdatedAt: string
  expectedRecoveryUpdatedAt: string
  masterEnvelope: KeyEnvelope
  recoveryEnvelope: KeyEnvelope
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "User not authenticated." }
  if (!isUuid(payload.vaultId)) return { error: "Vault ID is invalid." }
  const expectedMasterUpdatedAt = parseExpectedTimestamp(
    payload.expectedMasterUpdatedAt
  )
  const expectedRecoveryUpdatedAt = parseExpectedTimestamp(
    payload.expectedRecoveryUpdatedAt
  )
  if (!expectedMasterUpdatedAt || !expectedRecoveryUpdatedAt) {
    return { error: "Recovery state is stale. Restart recovery and try again." }
  }
  const masterError = validateKeyEnvelope(
    payload.masterEnvelope,
    "Master envelope"
  )
  if (masterError) return { error: masterError }
  const recoveryError = validateKeyEnvelope(
    payload.recoveryEnvelope,
    "Recovery envelope"
  )
  if (recoveryError) return { error: recoveryError }

  try {
    await withRls(user.id, async (tx) => {
      const recoveryUpdated = await tx
        .update(vaultKeyEnvelopes)
        .set(envelopeUpdateValues(payload.recoveryEnvelope))
        .where(
          and(
            eq(vaultKeyEnvelopes.vaultId, payload.vaultId),
            eq(vaultKeyEnvelopes.ownerId, user.id),
            eq(vaultKeyEnvelopes.envelopeType, "recovery"),
            gte(vaultKeyEnvelopes.updatedAt, expectedRecoveryUpdatedAt),
            lt(vaultKeyEnvelopes.updatedAt, new Date(expectedRecoveryUpdatedAt.getTime() + 1))
          )
        )
        .returning({ id: vaultKeyEnvelopes.id })

      if (recoveryUpdated.length !== 1) throw new Error("RECOVERY_CONFLICT")

      const masterUpdated = await tx
        .update(vaultKeyEnvelopes)
        .set(envelopeUpdateValues(payload.masterEnvelope))
        .where(
          and(
            eq(vaultKeyEnvelopes.vaultId, payload.vaultId),
            eq(vaultKeyEnvelopes.ownerId, user.id),
            eq(vaultKeyEnvelopes.envelopeType, "master"),
            gte(vaultKeyEnvelopes.updatedAt, expectedMasterUpdatedAt),
            lt(vaultKeyEnvelopes.updatedAt, new Date(expectedMasterUpdatedAt.getTime() + 1))
          )
        )
        .returning({ id: vaultKeyEnvelopes.id })

      if (masterUpdated.length !== 1) throw new Error("MASTER_CONFLICT")
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "RECOVERY_CONFLICT" ||
        error.message === "MASTER_CONFLICT")
    ) {
      return {
        error:
          "Vault security settings changed in another session. Restart recovery.",
      }
    }
    console.error("Vault recovery envelope rotation failed:", error)
    return { error: "Could not update vault recovery settings." }
  }

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "others",
  })

  return {
    success: true,
    otherSessionsInvalidated: !signOutError,
  }
}

export async function createVaultAndEnvelopesAction(payload: {
  nameCiphertext: string
  nameIv: string
  masterEnvelope: KeyEnvelope
  recoveryEnvelope: KeyEnvelope
  defaultTypes: Array<{
    payloadCiphertext: string
    iv: string
    sortOrder: number
  }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "User not authenticated." }
  }
  const nameError = validateEncryptedPayload(
    payload.nameCiphertext,
    payload.nameIv,
    "Encrypted vault name",
    16 * 1024
  )
  if (nameError) return { error: nameError }
  if (payload.defaultTypes.length > MAX_DEFAULT_CREDENTIAL_TYPES) {
    return { error: "Too many default credential types." }
  }
  const masterError = validateKeyEnvelope(
    payload.masterEnvelope,
    "Master envelope"
  )
  if (masterError) return { error: masterError }
  const recoveryError = validateKeyEnvelope(
    payload.recoveryEnvelope,
    "Recovery envelope"
  )
  if (recoveryError) return { error: recoveryError }
  for (const defaultType of payload.defaultTypes) {
    const defaultTypeError = validateEncryptedPayload(
      defaultType.payloadCiphertext,
      defaultType.iv,
      "Encrypted default credential type"
    )
    if (defaultTypeError) return { error: defaultTypeError }
    if (
      !Number.isSafeInteger(defaultType.sortOrder) ||
      defaultType.sortOrder < 0
    ) {
      return { error: "Default credential type sort order is invalid." }
    }
  }

  const result = await withRls(user.id, async (tx) => {
    // 1. Reject if a complete vault already exists (one with a master envelope).
    const completeVault = await tx
      .select({ vaultId: vaultKeyEnvelopes.vaultId })
      .from(vaultKeyEnvelopes)
      .where(
        and(
          eq(vaultKeyEnvelopes.ownerId, user.id),
          eq(vaultKeyEnvelopes.envelopeType, "master")
        )
      )
      .limit(1)

    if (completeVault.length > 0) {
      return {
        error:
          "A vault already exists for this account. Sign in and unlock it instead.",
      } as const
    }

    // 2. Upsert the single vault row for this owner (UNIQUE(owner_id)). This
    //    reuses an existing incomplete-vault row instead of deleting it, so we
    //    never cascade-delete related rows — fixing the previous data-loss path.
    const [vault] = await tx
      .insert(vaults)
      .values({
        ownerId: user.id,
        nameCiphertext: payload.nameCiphertext,
        nameIv: payload.nameIv,
        cryptoVersion: 1,
      })
      .onConflictDoUpdate({
        target: vaults.ownerId,
        set: {
          nameCiphertext: payload.nameCiphertext,
          nameIv: payload.nameIv,
          cryptoVersion: 1,
          updatedAt: new Date(),
        },
      })
      .returning({ id: vaults.id })

    // 3. Re-check after claiming the row: a concurrent create may have just
    //    completed this vault. If a master envelope now exists, abort without
    //    touching it. The truly-simultaneous case is additionally bounded by
    //    the existing (vault_id, envelope_type) unique index on the insert below.
    const masterExists = await tx
      .select({ id: vaultKeyEnvelopes.id })
      .from(vaultKeyEnvelopes)
      .where(
        and(
          eq(vaultKeyEnvelopes.vaultId, vault.id),
          eq(vaultKeyEnvelopes.envelopeType, "master")
        )
      )
      .limit(1)

    if (masterExists.length > 0) {
      return {
        error:
          "A vault already exists for this account. Sign in and unlock it instead.",
      } as const
    }

    // 4. Clear any partial envelopes/types left by a failed prior attempt on
    //    this row, then attach the master + recovery envelopes and defaults.
    await tx
      .delete(vaultKeyEnvelopes)
      .where(eq(vaultKeyEnvelopes.vaultId, vault.id))
    await tx
      .delete(credentialTypes)
      .where(eq(credentialTypes.vaultId, vault.id))

    await tx.insert(vaultKeyEnvelopes).values([
      {
        vaultId: vault.id,
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
        vaultId: vault.id,
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
    ])

    if (payload.defaultTypes.length > 0) {
      await tx.insert(credentialTypes).values(
        payload.defaultTypes.map((dt) => ({
          vaultId: vault.id,
          ownerId: user.id,
          payloadCiphertext: dt.payloadCiphertext,
          iv: dt.iv,
          sortOrder: dt.sortOrder,
          cryptoVersion: 1,
          schemaVersion: 1,
        }))
      )
    }

    return { vaultId: vault.id } as const
  })

  if ("error" in result) {
    return result
  }

  return { success: true, vaultId: result.vaultId }
}
