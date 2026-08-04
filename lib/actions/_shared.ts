import { credentials, credentialTypes, taskLists, tasks, vaults } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import type { DbTx } from "@/db/rls"

export async function vaultOwnedBy(
  tx: DbTx,
  vaultId: string,
  ownerId: string
): Promise<boolean> {
  const rows = await tx
    .select({ id: vaults.id })
    .from(vaults)
    .where(and(eq(vaults.id, vaultId), eq(vaults.ownerId, ownerId)))
  return rows.length > 0
}

export async function credentialTypeOwnedByVault(
  tx: DbTx,
  typeId: string,
  vaultId: string,
  ownerId: string
): Promise<boolean> {
  const rows = await tx
    .select({ id: credentialTypes.id })
    .from(credentialTypes)
    .where(
      and(
        eq(credentialTypes.id, typeId),
        eq(credentialTypes.vaultId, vaultId),
        eq(credentialTypes.ownerId, ownerId)
      )
    )
  return rows.length > 0
}

export async function credentialOwnedByVault(
  tx: DbTx,
  credentialId: string,
  vaultId: string,
  ownerId: string
): Promise<boolean> {
  const rows = await tx
    .select({ id: credentials.id })
    .from(credentials)
    .where(
      and(
        eq(credentials.id, credentialId),
        eq(credentials.vaultId, vaultId),
        eq(credentials.ownerId, ownerId)
      )
    )
  return rows.length > 0
}

export async function taskListOwnedByVault(
  tx: DbTx,
  listId: string,
  vaultId: string,
  ownerId: string
): Promise<boolean> {
  const rows = await tx
    .select({ id: taskLists.id })
    .from(taskLists)
    .where(
      and(
        eq(taskLists.id, listId),
        eq(taskLists.vaultId, vaultId),
        eq(taskLists.ownerId, ownerId)
      )
    )
  return rows.length > 0
}

export async function taskOwnedByVault(
  tx: DbTx,
  taskId: string,
  vaultId: string,
  ownerId: string
): Promise<boolean> {
  const rows = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.vaultId, vaultId),
        eq(tasks.ownerId, ownerId)
      )
    )
  return rows.length > 0
}
