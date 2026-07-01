import {
  DrizzleBuildsRepository,
  InMemoryBuildsRepository,
  type BuildsRepository,
} from "@launchblitz/db";
import { getDb, isDatabaseConfigured } from "./db";

// Survive Next.js dev/HMR module reloads so a build created via the API is still
// readable by the subsequent server render of the session page (same process).
const globalStore = globalThis as typeof globalThis & {
  __launchblitzBuildsRepo?: InMemoryBuildsRepository;
};

/**
 * Resolve the Builds repository:
 * - Postgres-backed when DATABASE_URL is configured.
 * - Otherwise an in-memory singleton so the create → land flow works locally,
 *   in CI, and in e2e without a database.
 */
export function getBuildsRepository(): BuildsRepository {
  if (isDatabaseConfigured()) {
    return new DrizzleBuildsRepository(getDb());
  }
  // Fail closed in production: an unset DATABASE_URL there is a misconfiguration,
  // and silently using volatile in-memory storage would lose founders' builds.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production; refusing to fall back to the in-memory builds store.",
    );
  }
  if (!globalStore.__launchblitzBuildsRepo) {
    console.warn(
      "[builds] DATABASE_URL is not set — using an in-memory store. Builds will not persist across restarts.",
    );
    globalStore.__launchblitzBuildsRepo = new InMemoryBuildsRepository();
  }
  return globalStore.__launchblitzBuildsRepo;
}
