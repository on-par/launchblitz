import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session";

// Gate the signed-in surface. Anonymous requests to the start-build flow are
// redirected to sign-in with a `redirect_url` that preserves their intent;
// signed-in requests pass straight through. See issue #7.
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect_url", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
}

// Only the signed-in surface is protected; the marketing site and auth pages
// stay public.
export const config = {
  matcher: [
    "/builds",
    "/builds/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
