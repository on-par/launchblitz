import { cookies } from "next/headers";
import { SESSION_COOKIE, type Session } from "./session";

// Server-only helpers over the session cookie. See ./session for the edge-safe
// primitives and docs/adr/0001-auth-session-boundary.md for the provider seam.

export { SESSION_COOKIE, START_BUILD_PATH, sanitizeRedirect } from "./session";
export type { Session } from "./session";

/** Read the current session from the request cookies, or null if signed out. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) {
    return null;
  }

  return { userId: value };
}
