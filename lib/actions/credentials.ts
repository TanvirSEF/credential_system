"use server"

import { createClient } from "@/lib/supabase/server"
import { credentials } from "@/db/schema"
import { eq, and, isNull, isNotNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import { credentialTypeOwnedByVault, vaultOwnedBy } from "./_shared"
import { isUuid, validateEncryptedPayload, validateVersion } from "./validation"

export async function fetchCredentialsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", credentials: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.vaultId, vaultId),
          eq(credentials.ownerId, user.id),
          isNull(credentials.deletedAt)
        )
      )
  )

  return { error: null, credentials: rows }
}

export async function fetchTrashCredentialsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", credentials: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.vaultId, vaultId),
          eq(credentials.ownerId, user.id),
          isNotNull(credentials.deletedAt)
        )
      )
  )

  return { error: null, credentials: rows }
}

export async function createCredentialAction(payload: {
  vaultId: string
  typeId?: string
  payloadCiphertext: string
  iv: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }
  if (!isUuid(payload.vaultId) || (payload.typeId && !isUuid(payload.typeId))) {
    return { error: "Invalid vault or credential type identifier." }
  }
  const validationError = validateEncryptedPayload(
    payload.payloadCiphertext,
    payload.iv,
    "Encrypted credential"
  )
  if (validationError) return { error: validationError }

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }
    if (
      payload.typeId &&
      !(await credentialTypeOwnedByVault(
        tx,
        payload.typeId,
        payload.vaultId,
        user.id
      ))
    ) {
      return { error: "Credential type does not belong to this vault." }
    }

    const inserted = await tx
      .insert(credentials)
      .values({
        vaultId: payload.vaultId,
        ownerId: user.id,
        typeId: payload.typeId || null,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        cryptoVersion: 1,
        schemaVersion: 1,
      })
      .returning()

    return { success: true, newCredential: inserted[0] }
  })
}

export async function updateCredentialAction(payload: {
  id: string
  typeId?: string
  payloadCiphertext: string
  iv: string
  version: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }
  if (!isUuid(payload.id) || (payload.typeId && !isUuid(payload.typeId))) {
    return { error: "Invalid credential or credential type identifier." }
  }
  const validationError =
    validateEncryptedPayload(
      payload.payloadCiphertext,
      payload.iv,
      "Encrypted credential"
    ) || validateVersion(payload.version)
  if (validationError) return { error: validationError }

  return withRls(user.id, async (tx) => {
    const current = await tx
      .select({ vaultId: credentials.vaultId })
      .from(credentials)
      .where(
        and(eq(credentials.id, payload.id), eq(credentials.ownerId, user.id))
      )

    if (!current[0]) return { error: "Credential not found." }
    if (
      payload.typeId &&
      !(await credentialTypeOwnedByVault(
        tx,
        payload.typeId,
        current[0].vaultId,
        user.id
      ))
    ) {
      return { error: "Credential type does not belong to this vault." }
    }

    const updated = await tx
      .update(credentials)
      .set({
        typeId: payload.typeId || null,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        version: payload.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(credentials.id, payload.id),
          eq(credentials.ownerId, user.id),
          eq(credentials.version, payload.version)
        )
      )
      .returning({ version: credentials.version })

    return updated.length === 1
      ? { success: true, version: updated[0].version }
      : {
          error:
            "This credential was changed elsewhere. Refresh before saving again.",
          conflict: true,
        }
  })
}

export async function softDeleteCredentialAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(credentials)
      .set({ deletedAt: new Date() })
      .where(and(eq(credentials.id, id), eq(credentials.ownerId, user.id)))
  )

  return { success: true }
}

export async function restoreCredentialAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(credentials)
      .set({ deletedAt: null })
      .where(and(eq(credentials.id, id), eq(credentials.ownerId, user.id)))
  )

  return { success: true }
}

export async function permanentDeleteCredentialAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .delete(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.ownerId, user.id)))
  )

  return { success: true }
}
