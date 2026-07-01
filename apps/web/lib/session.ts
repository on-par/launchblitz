// Import-safe session primitives shared by the proxy, server actions, server
// components, and the marketing page (a client component). Keep this module free
// of `next/headers` and other server-only imports so every one of those callers
// can import it — server-only helpers live in ./auth.
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

  // Resolve the target against a sentinel origin and keep it only if it stays
  // same-origin. Prefix checks alone are bypassable — browsers and the URL
  // parser strip embedded tab/newline/CR characters (`/\t/host` → `//host`) and
  // fold backslashes, so anything that resolves off-origin (network-path
  // references, scheme URLs, control-character tricks) is rejected here.
  const base = "https://launchblitz.internal";
  try {
    const resolved = new URL(target, base);
    if (resolved.origin !== base) {
      return START_BUILD_PATH;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return START_BUILD_PATH;
  }
}
