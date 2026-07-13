import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | undefined;
let db: NodePgDatabase | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lazily create and reuse a Drizzle client backed by a Postgres pool.
 * Throws when DATABASE_URL is unset — callers that need a graceful fallback
 * (e.g. local/e2e without a database) should branch on {@link isDatabaseConfigured}.
 */
export function getDb(): NodePgDatabase {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL is not set. Configure Postgres to enable database-backed builds.",
    );
  }
  if (!db) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // node-postgres emits 'error' on the pool for backend-reported errors on
    // idle clients (e.g. a dropped connection); without a listener that event
    // is unhandled and crashes the process.
    pool.on("error", (error) => {
      console.error("[db] Postgres pool error", error);
    });
    db = drizzle(pool);
  }
  return db;
}
