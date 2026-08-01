import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing PostgreSQL connection string (DIRECT_URL or POSTGRES_URL) in .env.");
}

// Use a small pool with short timeouts so connections are released promptly
// after each Server Action, preventing EMAXCONNSESSION on Supabase's
// session-mode pooler (pool_size = 15).
const client = postgres(connectionString, {
  prepare: false,   // required for Supabase pgBouncer
  max: 5,           // keep well under the 15-connection session-mode limit
  idle_timeout: 10, // release idle connections after 10 seconds
  max_lifetime: 60, // force-close connections older than 60 seconds
  connect_timeout: 10,
});
export const db = drizzle(client);
