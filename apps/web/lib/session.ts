// Edge-safe session primitives shared by the middleware, server actions, and
// server components. Keep this module free of `next/headers` and other
// Node-only imports so the middleware (edge runtime) can use it.
//
// This is the seam where a real auth provider (Supabase or Clerk) will attach:
// it would issue and verify `SESSION_COOKIE` while the routing/return-path
// contract stays unchanged. See docs/adr/0001-auth-session-boundary.md.

export const SESSION_COOKIE = "lb_session";

// Where anonymous visitors land after authenticating, and the CTA's target.
export const START_BUILD_PATH = "/builds";

export type Session = {
  userId: string;
};

/**
 * Constrain a post-auth return path to an in-app location. Only same-origin
 * absolute paths are allowed; anything else (external URLs, protocol-relative
 * `//host`, backslash tricks) falls back to the start-build flow. This keeps the
 * `redirect_url` parameter from becoming an open-redirect vector.
 */
export function sanitizeRedirect(target: string | null | undefined): string {
  if (!target) {
    return START_BUILD_PATH;
  }

  // Must be a rooted path, and must not start a network-path reference
  // (`//host`) or a backslash-escaped variant that browsers normalize to one.
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return START_BUILD_PATH;
  }

  return target;
}
