import "dotenv/config";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

if ((process.env.DATABASE_AUTHORIZATION_MODE || "supabase-rls") !== "supabase-rls") {
  console.log("Skipping Supabase RLS policies in application authorization mode.");
  process.exit(0);
}

const connectionString =
  process.env.DIRECT_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is required to apply RLS policies.");
}

const policySql = await readFile(new URL("../db/rls.sql", import.meta.url), "utf8");
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  connect_timeout: 10,
});

try {
  await client.unsafe(policySql);
  console.log("Supabase RLS policies applied successfully.");
} finally {
  await client.end({ timeout: 5 });
}
