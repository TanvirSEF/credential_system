import { vaults } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { DbTx } from "@/db/rls";

export async function vaultOwnedBy(
  tx: DbTx,
  vaultId: string,
  ownerId: string
): Promise<boolean> {
  const rows = await tx
    .select({ id: vaults.id })
    .from(vaults)
    .where(and(eq(vaults.id, vaultId), eq(vaults.ownerId, ownerId)));
  return rows.length > 0;
}
