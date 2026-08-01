import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing PostgreSQL connection string (DIRECT_URL or POSTGRES_URL) in .env.");
}

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
