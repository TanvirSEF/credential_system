"use server"

import { createClient } from "@/lib/supabase/server"
import { credentialTypes } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import { credentialTypeOwnedByVault, vaultOwnedBy } from "./_shared"
import { isUuid, validateEncryptedPayload } from "./validation"

export async function fetchCredentialTypesAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", types: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(credentialTypes)
      .where(
        and(
          eq(credentialTypes.vaultId, vaultId),
          eq(credentialTypes.ownerId, user.id),
          isNull(credentialTypes.archivedAt)
        )
      )
  )

  return { error: null, types: rows }
}

export async function createCredentialTypeAction(payload: {
  vaultId: string
  parentId?: string
  payloadCiphertext: string
  iv: string
  sortOrder: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }
  if (
    !isUuid(payload.vaultId) ||
    (payload.parentId && !isUuid(payload.parentId))
  ) {
    return { error: "Invalid vault or parent category identifier." }
  }
  if (!Number.isSafeInteger(payload.sortOrder) || payload.sortOrder < 0) {
    return { error: "Category sort order is invalid." }
  }
  const validationError = validateEncryptedPayload(
    payload.payloadCiphertext,
    payload.iv,
    "Encrypted credential type"
  )
  if (validationError) return { error: validationError }

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }
    if (
      payload.parentId &&
      !(await credentialTypeOwnedByVault(
        tx,
        payload.parentId,
        payload.vaultId,
        user.id
      ))
    ) {
      return { error: "Parent category does not belong to this vault." }
    }

    const inserted = await tx
      .insert(credentialTypes)
      .values({
        vaultId: payload.vaultId,
        ownerId: user.id,
        parentId: payload.parentId || null,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        sortOrder: payload.sortOrder,
        cryptoVersion: 1,
        schemaVersion: 1,
      })
      .returning()

    return { success: true, newType: inserted[0] }
  })
}

export async function archiveCredentialTypeAction(typeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(credentialTypes)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(credentialTypes.id, typeId),
          eq(credentialTypes.ownerId, user.id)
        )
      )
  )

  return { success: true }
}
