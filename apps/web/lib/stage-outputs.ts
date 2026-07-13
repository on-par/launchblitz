import {
  DrizzleStageOutputsRepository,
  InMemoryStageOutputsRepository,
  type StageOutputsRepository,
} from "@launchblitz/db";
import { getDb, isDatabaseConfigured } from "./db";

// Survive Next.js dev/HMR module reloads so an edit saved via the API is still
// readable by the subsequent server render of the session page (same process).
const globalStore = globalThis as typeof globalThis & {
  __launchblitzStageOutputsRepo?: InMemoryStageOutputsRepository;
};

/**
 * Resolve the Stage outputs repository:
 * - Postgres-backed when DATABASE_URL is configured.
 * - Otherwise an in-memory singleton so the edit → reload flow works locally,
 *   in CI, and in e2e without a database.
 */
export function getStageOutputsRepository(): StageOutputsRepository {
  if (isDatabaseConfigured()) {
    return new DrizzleStageOutputsRepository(getDb());
  }
  // Fail closed in production: an unset DATABASE_URL there is a misconfiguration,
  // and silently using volatile in-memory storage would lose founders' edits.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production; refusing to fall back to the in-memory stage outputs store.",
    );
  }
  if (!globalStore.__launchblitzStageOutputsRepo) {
    console.warn(
      "[stage-outputs] DATABASE_URL is not set — using an in-memory store. Stage outputs will not persist across restarts.",
    );
    globalStore.__launchblitzStageOutputsRepo = new InMemoryStageOutputsRepository();
  }
  return globalStore.__launchblitzStageOutputsRepo;
}
