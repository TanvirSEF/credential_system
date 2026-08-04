"use server"

import { createClient } from "@/lib/supabase/server"
import { tasks } from "@/db/schema"
import { eq, and, isNull, isNotNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import {
  vaultOwnedBy,
  taskListOwnedByVault,
  taskOwnedByVault,
} from "./_shared"
import { isUuid, validateEncryptedPayload, validateVersion } from "./validation"

export async function fetchTasksAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", tasks: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.vaultId, vaultId),
          eq(tasks.ownerId, user.id),
          isNull(tasks.deletedAt)
        )
      )
  )

  return { error: null, tasks: rows }
}

export async function fetchTrashTasksAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", tasks: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.vaultId, vaultId),
          eq(tasks.ownerId, user.id),
          isNotNull(tasks.deletedAt)
        )
      )
  )

  return { error: null, tasks: rows }
}

export async function createTaskAction(payload: {
  id?: string
  vaultId: string
  listId?: string | null
  parentId?: string | null
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
  if (
    !isUuid(payload.vaultId) ||
    (payload.id && !isUuid(payload.id)) ||
    (payload.listId && !isUuid(payload.listId)) ||
    (payload.parentId && !isUuid(payload.parentId))
  ) {
    return { error: "Invalid task or vault identifier." }
  }
  const validationError = validateEncryptedPayload(
    payload.payloadCiphertext,
    payload.iv,
    "Encrypted task"
  )
  if (validationError) return { error: validationError }

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }
    if (
      payload.listId &&
      !(await taskListOwnedByVault(
        tx,
        payload.listId,
        payload.vaultId,
        user.id
      ))
    ) {
      return { error: "Task list does not belong to this vault." }
    }
    if (
      payload.parentId &&
      !(await taskOwnedByVault(
        tx,
        payload.parentId,
        payload.vaultId,
        user.id
      ))
    ) {
      return { error: "Parent task does not belong to this vault." }
    }

    const inserted = await tx
      .insert(tasks)
      .values({
        ...(payload.id ? { id: payload.id } : {}),
        vaultId: payload.vaultId,
        ownerId: user.id,
        listId: payload.listId || null,
        parentId: payload.parentId || null,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        cryptoVersion: 1,
        schemaVersion: 1,
      })
      .onConflictDoNothing({ target: tasks.id })
      .returning()

    return { success: true, newTask: inserted[0] }
  })
}

export async function updateTaskAction(payload: {
  id: string
  payloadCiphertext: string
  iv: string
  version: number
  listId?: string | null
  parentId?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }
  if (
    !isUuid(payload.id) ||
    (payload.listId && !isUuid(payload.listId)) ||
    (payload.parentId && !isUuid(payload.parentId))
  ) {
    return { error: "Invalid task identifier." }
  }
  const validationError =
    validateEncryptedPayload(
      payload.payloadCiphertext,
      payload.iv,
      "Encrypted task"
    ) || validateVersion(payload.version)
  if (validationError) return { error: validationError }

  const updated = await withRls(user.id, (tx) =>
    tx
      .update(tasks)
      .set({
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        ...(payload.listId !== undefined
          ? { listId: payload.listId || null }
          : {}),
        ...(payload.parentId !== undefined
          ? { parentId: payload.parentId || null }
          : {}),
        version: payload.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tasks.id, payload.id),
          eq(tasks.ownerId, user.id),
          eq(tasks.version, payload.version)
        )
      )
      .returning({ version: tasks.version })
  )

  return updated.length === 1
    ? { success: true, version: updated[0].version }
    : {
        error: "This task was changed elsewhere. Refresh before saving again.",
        conflict: true,
      }
}

export async function softDeleteTaskAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, user.id)))
  )

  return { success: true }
}

export async function restoreTaskAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(tasks)
      .set({ deletedAt: null })
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, user.id)))
  )

  return { success: true }
}

export async function permanentDeleteTaskAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, user.id)))
  )

  return { success: true }
}
