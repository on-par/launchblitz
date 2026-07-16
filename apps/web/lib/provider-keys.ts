import {
  DrizzleProviderKeysRepository,
  InMemoryProviderKeysRepository,
  type ProviderKeysRepository,
} from "@launchblitz/db";
import { getDb, isDatabaseConfigured } from "./db";

// Survive Next.js dev/HMR module reloads so a key saved via the API is still
// readable by the subsequent server render of a readiness check (same process).
const globalStore = globalThis as typeof globalThis & {
  __launchblitzProviderKeysRepo?: InMemoryProviderKeysRepository;
};

/**
 * Resolve the provider keys repository:
 * - Postgres-backed when DATABASE_URL is configured.
 * - Otherwise an in-memory singleton so the save → readiness-check flow
 *   works locally, in CI, and in e2e without a database.
 */
export function getProviderKeysRepository(): ProviderKeysRepository {
  if (isDatabaseConfigured()) {
    return new DrizzleProviderKeysRepository(getDb());
  }
  // Fail closed in production: an unset DATABASE_URL there is a misconfiguration,
  // and silently using volatile in-memory storage would lose founders' provider keys.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production; refusing to fall back to the in-memory provider keys store.",
    );
  }
  if (!globalStore.__launchblitzProviderKeysRepo) {
    console.warn(
      "[provider-keys] DATABASE_URL is not set — using an in-memory store. Provider keys will not persist across restarts.",
    );
    globalStore.__launchblitzProviderKeysRepo = new InMemoryProviderKeysRepository();
  }
  return globalStore.__launchblitzProviderKeysRepo;
}
