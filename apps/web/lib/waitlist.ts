import {
  DrizzleWaitlistSignupsRepository,
  InMemoryWaitlistSignupsRepository,
  type WaitlistSignupsRepository,
} from "@launchblitz/db";
import { getDb, isDatabaseConfigured } from "./db";

// Survive Next.js dev/HMR module reloads, same rationale as apps/web/lib/builds.ts.
const globalStore = globalThis as typeof globalThis & {
  __launchblitzWaitlistSignupsRepo?: InMemoryWaitlistSignupsRepository;
};

/**
 * Resolve the waitlist signups repository:
 * - Postgres-backed when DATABASE_URL is configured.
 * - Otherwise an in-memory singleton so local dev/CI/e2e still work.
 */
export function getWaitlistSignupsRepository(): WaitlistSignupsRepository {
  if (isDatabaseConfigured()) {
    return new DrizzleWaitlistSignupsRepository(getDb());
  }
  // Fail closed in production: an unset DATABASE_URL there is a misconfiguration,
  // and silently using volatile in-memory storage would silently lose signups.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production; refusing to fall back to the in-memory waitlist store.",
    );
  }
  if (!globalStore.__launchblitzWaitlistSignupsRepo) {
    console.warn(
      "[waitlist] DATABASE_URL is not set — using an in-memory store. Signups will not persist across restarts.",
    );
    globalStore.__launchblitzWaitlistSignupsRepo = new InMemoryWaitlistSignupsRepository();
  }
  return globalStore.__launchblitzWaitlistSignupsRepo;
}
