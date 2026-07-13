import { createDb, type Database } from "@launchblitz/db";

let db: Database | undefined;

export function getDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  }
  return (db ??= createDb(url));
}
