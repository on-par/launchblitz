import type { Db } from "@launchblitz/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type { Db };

let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    const pool = new Pool({ connectionString });
    db = drizzle(pool);
  }

  return db;
}
