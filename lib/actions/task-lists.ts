"use server"

import { createClient } from "@/lib/supabase/server"
import { taskLists } from "@/db/schema"
import { eq, and, isNull, isNotNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import { vaultOwnedBy } from "./_shared"
import { isUuid, validateEncryptedPayload, validateVersion } from "./validation"

export async function fetchTaskListsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", taskLists: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(taskLists)
      .where(
        and(
          eq(taskLists.vaultId, vaultId),
          eq(taskLists.ownerId, user.id),
          isNull(taskLists.deletedAt)
        )
      )
  )

  return { error: null, taskLists: rows }
}

export async function fetchTrashTaskListsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", taskLists: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(taskLists)
      .where(
        and(
          eq(taskLists.vaultId, vaultId),
          eq(taskLists.ownerId, user.id),
          isNotNull(taskLists.deletedAt)
        )
      )
  )

  return { error: null, taskLists: rows }
}

export async function createTaskListAction(payload: {
  id?: string
  vaultId: string
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
  if (!isUuid(payload.vaultId) || (payload.id && !isUuid(payload.id))) {
    return { error: "Invalid task list or vault identifier." }
  }
  if (!Number.isSafeInteger(payload.sortOrder) || payload.sortOrder < 0) {
    return { error: "Task list sort order is invalid." }
  }
  const validationError = validateEncryptedPayload(
    payload.payloadCiphertext,
    payload.iv,
    "Encrypted task list"
  )
  if (validationError) return { error: validationError }

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }

    const inserted = await tx
      .insert(taskLists)
      .values({
        ...(payload.id ? { id: payload.id } : {}),
        vaultId: payload.vaultId,
        ownerId: user.id,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        sortOrder: payload.sortOrder,
        cryptoVersion: 1,
        schemaVersion: 1,
      })
      .onConflictDoNothing({ target: taskLists.id })
      .returning()

    return { success: true, newTaskList: inserted[0] }
  })
}

export async function updateTaskListAction(payload: {
  id: string
  payloadCiphertext: string
  iv: string
  version: number
  sortOrder?: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }
  if (!isUuid(payload.id)) return { error: "Invalid task list identifier." }
  const validationError =
    validateEncryptedPayload(
      payload.payloadCiphertext,
      payload.iv,
      "Encrypted task list"
    ) || validateVersion(payload.version)
  if (validationError) return { error: validationError }
  if (
    payload.sortOrder !== undefined &&
    (!Number.isSafeInteger(payload.sortOrder) || payload.sortOrder < 0)
  ) {
    return { error: "Task list sort order is invalid." }
  }

  const updated = await withRls(user.id, (tx) =>
    tx
      .update(taskLists)
      .set({
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        ...(payload.sortOrder !== undefined
          ? { sortOrder: payload.sortOrder }
          : {}),
        version: payload.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(taskLists.id, payload.id),
          eq(taskLists.ownerId, user.id),
          eq(taskLists.version, payload.version)
        )
      )
      .returning({ version: taskLists.version })
  )

  return updated.length === 1
    ? { success: true, version: updated[0].version }
    : {
        error:
          "This list was changed elsewhere. Refresh before saving again.",
        conflict: true,
      }
}

export async function softDeleteTaskListAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(taskLists)
      .set({ deletedAt: new Date() })
      .where(and(eq(taskLists.id, id), eq(taskLists.ownerId, user.id)))
  )

  return { success: true }
}

export async function restoreTaskListAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(taskLists)
      .set({ deletedAt: null })
      .where(and(eq(taskLists.id, id), eq(taskLists.ownerId, user.id)))
  )

  return { success: true }
}

export async function permanentDeleteTaskListAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .delete(taskLists)
      .where(and(eq(taskLists.id, id), eq(taskLists.ownerId, user.id)))
  )

  return { success: true }
}
