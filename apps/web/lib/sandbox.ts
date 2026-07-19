import { InMemoryPreviewStore, InMemorySandboxAdapter, VercelSandboxAdapter, type SandboxAdapter } from "@launchblitz/sandbox";

// Survive Next.js dev/HMR module reloads, same rationale as apps/web/lib/builds.ts.
// Cached as the SandboxAdapter interface (not a specific impl) because
// VercelSandboxAdapter also needs to be a singleton: it tracks live
// workspaces in an instance field, so a fresh instance per call would make
// any workspace invisible to a later call that needs to look it up.
const globalStore = globalThis as typeof globalThis & {
  __launchblitzSandboxAdapter?: SandboxAdapter;
  __launchblitzPreviewStore?: InMemoryPreviewStore;
};

export function isSandboxConfigured(): boolean {
  if (process.env.VERCEL_OIDC_TOKEN) {
    return true;
  }
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID);
}

/**
 * Resolve the sandbox adapter:
 * - Vercel Sandbox when a provider credential is configured.
 * - Otherwise an in-memory singleton so previews work locally, in CI, and in
 *   e2e without a provider — it only records files and executes nothing, so
 *   generated content never runs anywhere unconfigured.
 */
export function getSandboxAdapter(): SandboxAdapter {
  if (globalStore.__launchblitzSandboxAdapter) {
    return globalStore.__launchblitzSandboxAdapter;
  }

  if (isSandboxConfigured()) {
    globalStore.__launchblitzSandboxAdapter = new VercelSandboxAdapter();
    return globalStore.__launchblitzSandboxAdapter;
  }
  // Fail closed in production: an unconfigured provider there is a
  // misconfiguration, and silently using the in-memory adapter would make
  // "Start preview" a no-op that never serves anything.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No sandbox provider is configured in production; refusing to fall back to the in-memory sandbox adapter.",
    );
  }
  console.warn(
    "[sandbox] No sandbox provider is configured — using an in-memory adapter. Previews will not actually run.",
  );
  globalStore.__launchblitzSandboxAdapter = new InMemorySandboxAdapter();
  return globalStore.__launchblitzSandboxAdapter;
}

export function getPreviewStore(): InMemoryPreviewStore {
  if (!globalStore.__launchblitzPreviewStore) {
    globalStore.__launchblitzPreviewStore = new InMemoryPreviewStore();
  }
  return globalStore.__launchblitzPreviewStore;
}
