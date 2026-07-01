import type { BrowserContext } from "@playwright/test";
import { SESSION_COOKIE } from "../../apps/web/lib/session";

// Seeding the app's real session cookie lets a test exercise the signed-in
// surface without a live auth provider — the same seam the real provider will
// plug into (docs/adr/0001-auth-session-boundary.md). Importing the constant
// keeps this in lockstep with the app if the cookie is ever renamed.
export { SESSION_COOKIE };

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
