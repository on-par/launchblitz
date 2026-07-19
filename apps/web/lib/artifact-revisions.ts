import {
  DrizzleArtifactRevisionsRepository,
  InMemoryArtifactRevisionsRepository,
  type ArtifactRevisionsRepository,
} from "@launchblitz/db";
import { getDb, isDatabaseConfigured } from "./db";

// Survive Next.js dev/HMR module reloads, same rationale as apps/web/lib/builds.ts.
const globalStore = globalThis as typeof globalThis & {
  __launchblitzArtifactRevisionsRepo?: InMemoryArtifactRevisionsRepository;
};

/**
 * Resolve the ArtifactRevisions repository:
 * - Postgres-backed when DATABASE_URL is configured.
 * - Otherwise an in-memory singleton so the create → list → preview flow
 *   works locally, in CI, and in e2e without a database.
 */
export function getArtifactRevisionsRepository(): ArtifactRevisionsRepository {
  if (isDatabaseConfigured()) {
    return new DrizzleArtifactRevisionsRepository(getDb());
  }
  // Fail closed in production: an unset DATABASE_URL there is a misconfiguration,
  // and silently using volatile in-memory storage would lose founders' revisions.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production; refusing to fall back to the in-memory artifact revisions store.",
    );
  }
  if (!globalStore.__launchblitzArtifactRevisionsRepo) {
    console.warn(
      "[artifact-revisions] DATABASE_URL is not set — using an in-memory store. Revisions will not persist across restarts.",
    );
    globalStore.__launchblitzArtifactRevisionsRepo = new InMemoryArtifactRevisionsRepository();
  }
  return globalStore.__launchblitzArtifactRevisionsRepo;
}
