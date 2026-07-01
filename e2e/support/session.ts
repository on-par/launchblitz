import type { BrowserContext } from "@playwright/test";

// Mirrors the session cookie the app sets on sign-in. Seeding it lets a test
// exercise the signed-in surface without a live auth provider — the same seam
// the real provider will plug into (docs/adr/0001-auth-session-boundary.md).
export const SESSION_COOKIE = "lb_session";

export async function signIn(context: BrowserContext) {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: "e2e-session",
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
