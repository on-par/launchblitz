import { auth } from "@clerk/nextjs/server";

// Stable identity used for local dev, CI, and e2e where Clerk is not configured.
// This lets the persistence-backed flow work end to end without real auth wired
// (issue #7 owns the real sign-in routing that sits in front of this).
const DEV_USER_ID = "dev-founder";

function clerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

/**
 * Resolve the current founder's id.
 * - With Clerk configured: the authenticated user id, or null when signed out.
 * - Without Clerk (dev/CI/e2e): a stable placeholder founder so the flow works.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (clerkConfigured()) {
    try {
      const { userId } = await auth();
      return userId ?? null;
    } catch {
      // Clerk keys are present but clerkMiddleware isn't wired yet (issue #7 owns
      // that). Treat as signed out rather than crashing the request with a 500.
      return null;
    }
  }
  return DEV_USER_ID;
}
