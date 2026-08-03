"use server"

import { createClient } from "@/lib/supabase/server"
import { notes } from "@/db/schema"
import { eq, and, isNull, isNotNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import { vaultOwnedBy } from "./_shared"

export async function fetchNotesAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", notes: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.vaultId, vaultId),
          eq(notes.ownerId, user.id),
          isNull(notes.deletedAt)
        )
      )
  )

  return { error: null, notes: rows }
}

export async function fetchTrashNotesAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", notes: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.vaultId, vaultId),
          eq(notes.ownerId, user.id),
          isNotNull(notes.deletedAt)
        )
      )
  )

  return { error: null, notes: rows }
}

export async function createNoteAction(payload: {
  vaultId: string
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

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }

    const inserted = await tx
      .insert(notes)
      .values({
        vaultId: payload.vaultId,
        ownerId: user.id,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        cryptoVersion: 1,
        schemaVersion: 1,
      })
      .returning()

    return { success: true, newNote: inserted[0] }
  })
}

export async function updateNoteAction(payload: {
  id: string
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

  await withRls(user.id, (tx) =>
    tx
      .update(notes)
      .set({
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        version: payload.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, payload.id), eq(notes.ownerId, user.id)))
  )

  return { success: true }
}

export async function softDeleteNoteAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.ownerId, user.id)))
  )

  return { success: true }
}

export async function restoreNoteAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(notes)
      .set({ deletedAt: null })
      .where(and(eq(notes.id, id), eq(notes.ownerId, user.id)))
  )

  return { success: true }
}

export async function permanentDeleteNoteAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx.delete(notes).where(and(eq(notes.id, id), eq(notes.ownerId, user.id)))
  )

  return { success: true }
}
