"use server"

import { createClient } from "@/lib/supabase/server"
import { projects } from "@/db/schema"
import { eq, and, isNull, isNotNull } from "drizzle-orm"
import { withRls } from "@/db/rls"
import { vaultOwnedBy } from "./_shared"
import { isUuid, validateEncryptedPayload, validateVersion } from "./validation"

export async function fetchProjectsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", projects: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.vaultId, vaultId),
          eq(projects.ownerId, user.id),
          isNull(projects.deletedAt)
        )
      )
  )

  return { error: null, projects: rows }
}

export async function fetchTrashProjectsAction(vaultId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated.", projects: [] }
  }

  const rows = await withRls(user.id, (tx) =>
    tx
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.vaultId, vaultId),
          eq(projects.ownerId, user.id),
          isNotNull(projects.deletedAt)
        )
      )
  )

  return { error: null, projects: rows }
}

export async function createProjectAction(payload: {
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
  if (!isUuid(payload.vaultId)) return { error: "Invalid vault identifier." }
  const validationError = validateEncryptedPayload(
    payload.payloadCiphertext,
    payload.iv,
    "Encrypted project"
  )
  if (validationError) return { error: validationError }

  return withRls(user.id, async (tx) => {
    if (!(await vaultOwnedBy(tx, payload.vaultId, user.id))) {
      return { error: "Vault not found." }
    }

    const inserted = await tx
      .insert(projects)
      .values({
        vaultId: payload.vaultId,
        ownerId: user.id,
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        cryptoVersion: 1,
        schemaVersion: 1,
      })
      .returning()

    return { success: true, newProject: inserted[0] }
  })
}

export async function updateProjectAction(payload: {
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
  if (!isUuid(payload.id)) return { error: "Invalid project identifier." }
  const validationError =
    validateEncryptedPayload(
      payload.payloadCiphertext,
      payload.iv,
      "Encrypted project"
    ) || validateVersion(payload.version)
  if (validationError) return { error: validationError }

  const updated = await withRls(user.id, (tx) =>
    tx
      .update(projects)
      .set({
        payloadCiphertext: payload.payloadCiphertext,
        iv: payload.iv,
        version: payload.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, payload.id),
          eq(projects.ownerId, user.id),
          eq(projects.version, payload.version)
        )
      )
      .returning({ version: projects.version })
  )

  return updated.length === 1
    ? { success: true, version: updated[0].version }
    : {
        error:
          "This project was changed elsewhere. Refresh before saving again.",
        conflict: true,
      }
}

export async function softDeleteProjectAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
  )

  return { success: true }
}

export async function restoreProjectAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .update(projects)
      .set({ deletedAt: null })
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
  )

  return { success: true }
}

export async function permanentDeleteProjectAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await withRls(user.id, (tx) =>
    tx
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
  )

  return { success: true }
}
