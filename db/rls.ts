import { sql } from "drizzle-orm"
import { db } from "./index"

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type { DbTx }

export function withRls<T>(
  userId: string,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  const authorizationMode =
    process.env.DATABASE_AUTHORIZATION_MODE || "supabase-rls"

  if (authorizationMode === "application") {
    return db.transaction(fn)
  }

  if (authorizationMode !== "supabase-rls") {
    throw new Error(
      "DATABASE_AUTHORIZATION_MODE must be 'supabase-rls' or 'application'."
    )
  }

  const claims = JSON.stringify({ sub: userId, role: "authenticated" })
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role authenticated`)
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${claims}, true)`
    )
    return fn(tx)
  })
}
