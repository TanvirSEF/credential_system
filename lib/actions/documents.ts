"use server"

import { createClient } from "@/lib/supabase/server"
import { documents } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import {
  objectKeyForDocument,
  presignPutUrl,
  presignGetUrl,
  deleteObject,
} from "@/lib/storage/object-storage"
import { vaultOwnedBy } from "./_shared"

export async function fetchDocumentsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", documents: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.vaultId, vaultId),
          eq(documents.ownerId, user.id),
          isNull(documents.deletedAt)
        )
      )
  )

  return { error: null, documents: rows }
}

export async function createDocumentUploadUrlAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const owned = await withRls(user.id, (tx) =>
    vaultOwnedBy(tx, vaultId, user.id)
  )
  if (!owned) {
    return { error: "Vault not found." }
  }

  const storagePath = objectKeyForDocument(user.id)
  const uploadUrl = await presignPutUrl(
    storagePath,
    "application/octet-stream",
    120
  )

  return { error: null, storagePath, uploadUrl }
}

export async function getDocumentDownloadUrlAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select({ storagePath: documents.storagePath })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, user.id)))
  )

  if (rows.length === 0) {
    return { error: "Document not found." }
  }

  const downloadUrl = await presignGetUrl(rows[0].storagePath, 120)
  return { error: null, downloadUrl }
}

export async function createDocumentRecordAction(payload: {
  vaultId: string
  credentialId?: string
  storagePath: string
  metadataCiphertext: string
  metadataIv: string
  ciphertextSha256: string
  ciphertextSize: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }

    if (!payload.storagePath.startsWith(`documents/${user.id}/`)) {
      return { error: "Invalid document storage path." }
    }

    const inserted = await tx
      .insert(documents)
      .values({
        vaultId: payload.vaultId,
        ownerId: user.id,
        credentialId: payload.credentialId || null,
        storagePath: payload.storagePath,
        metadataCiphertext: payload.metadataCiphertext,
        metadataIv: payload.metadataIv,
        ciphertextSha256: payload.ciphertextSha256,
        ciphertextSize: payload.ciphertextSize,
        cryptoVersion: 1,
        version: 1,
        uploadStatus: "completed",
      })
      .returning()

    return { success: true, newDocument: inserted[0] }
  })
}

export async function softDeleteDocumentAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(and(eq(documents.id, id), eq(documents.ownerId, user.id)))
  )

  return { success: true }
}

export async function permanentDeleteDocumentAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select({ storagePath: documents.storagePath })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, user.id)))
  )

  if (rows.length > 0) {
    try {
      await deleteObject(rows[0].storagePath)
    } catch (err) {
      console.warn("R2 object delete failed:", err)
    }

    await withRls(user.id, (tx) =>
      tx
        .delete(documents)
        .where(and(eq(documents.id, id), eq(documents.ownerId, user.id)))
    )
  }

  return { success: true }
}
