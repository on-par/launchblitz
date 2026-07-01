"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sanitizeRedirect } from "../../lib/session";

// Establish a session and return the visitor to where they were headed.
//
// The credential exchange itself is intentionally a stub for the MVP: a real
// provider (Supabase or Clerk) will verify the email/password here and issue
// the session. The routing and return-path contract around it — sanitize the
// target, set the cookie, redirect — is the real, tested part of issue #7.
export async function authenticate(formData: FormData) {
  const redirectUrl = sanitizeRedirect(formData.get("redirect_url")?.toString());

  const store = await cookies();
  store.set(SESSION_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(redirectUrl);
}
