import { credentials, credentialTypes, vaults } from "@/db/schema"
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
