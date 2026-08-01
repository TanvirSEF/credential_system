import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing in .env file.");
}

// Supabase Transaction Pooler (port 5432 / 6543) requires `prepare: false`
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
