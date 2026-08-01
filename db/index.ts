import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseProvider = process.env.DATABASE_PROVIDER || "postgresql";
if (databaseProvider !== "postgresql") {
  throw new Error(
    `Unsupported DATABASE_PROVIDER '${databaseProvider}'. This release supports PostgreSQL only.`
  );
}

const configuredConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL;

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!configuredConnectionString && !isProductionBuild) {
  throw new Error("Missing PostgreSQL connection string (DATABASE_URL or POSTGRES_URL) in .env.");
}

// Next.js evaluates server modules while producing a standalone image. postgres-js
// opens connections lazily, so a non-routable build-only URL keeps secrets out of
// Docker build layers without making a network connection.
const connectionString =
  configuredConnectionString || "postgresql://build:build@127.0.0.1:5432/build";

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
