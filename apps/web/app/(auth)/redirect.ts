import { sanitizeRedirect } from "../../lib/session";

// Shared return-path handling for the sign-in and sign-up pages. Search params
// can arrive as a repeated key (`?redirect_url=/a&redirect_url=/b`), which Next
// surfaces as an array — collapse to the first value before sanitizing so the
// pages never call string methods on an array.
export function resolveRedirect(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return sanitizeRedirect(raw);
}

// Build a link to the sibling auth page that carries the (already sanitized)
// return path forward.
export function authHref(path: string, redirectUrl: string): string {
  return `${path}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}
