import type { Db } from "@launchblitz/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type { Db };

let db: Db | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Db {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    const pool = new Pool({ connectionString });
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
