# 1. Provider-agnostic session boundary for the start-build flow

Date: 2026-07-01

## Status

Accepted

## Context

Issue #7 routes the homepage primary CTA into a real authenticated start-build
flow: anonymous visitors must pass through sign-in/sign-up before reaching the
signed-in surface, signed-in visitors go straight in, and the return path must
preserve intent.

At the time of this decision the repo had no working auth. `@clerk/nextjs` was a
dependency and the sign-in/sign-up pages carried "Clerk placeholder" copy, but
nothing was wired (no provider, no middleware) and there were no Clerk keys in
any environment. The only provisioned service was a Supabase project
(`NEXT_PUBLIC_SUPABASE_URL` + anon key). CI (`pr-verify.yml`) runs the full
Playwright suite and holds no auth secrets.

That creates a tension: the acceptance criteria require Playwright coverage of
*both* the anonymous and signed-in CTA paths, but a real Clerk/Supabase signed-in
session in CI would need live credentials as secrets, which we do not have and
which would make CI red.

## Decision

Model the auth boundary as a single opaque session cookie (`lb_session`) and put
the *routing and return-path* contract — not any specific provider — under test:

- `apps/web/proxy.ts` (Next.js 16's renamed middleware convention) gates the
  signed-in surface (`/builds`, `/dashboard`, `/settings`). No session ⇒ redirect
  to `/sign-in?redirect_url=<original>`; session present ⇒ pass through.
- The sign-in/sign-up server action sanitizes the return path
  (`sanitizeRedirect`, same-origin paths only — no open redirects), sets the
  session cookie, and redirects back to the preserved intent.
- Edge-safe primitives live in `apps/web/lib/session.ts`; server-only helpers in
  `apps/web/lib/auth.ts`.

The credential exchange itself is intentionally a stub. A real provider
(Supabase or Clerk) attaches at exactly one seam — issuing and verifying
`lb_session` inside the sign-in/sign-up action — without changing the gating or
return-path behavior around it. Tests seed the cookie directly to exercise the
signed-in path.

## Consequences

- Both acceptance-criteria paths (anonymous and signed-in) are covered by
  Playwright and stay green in CI with zero auth secrets.
- The signed-in surface is genuinely gated and deployable today; the routing
  contract is real even though the identity check is not yet.
- Choosing and wiring the concrete provider (Supabase is the frontrunner, since
  it is already provisioned) is deferred to a follow-up, scoped to the single
  seam above. The "Clerk placeholder" framing in the UI is retired.
- The cookie is not yet a verifiable credential: anyone who can set `lb_session`
  is treated as signed in. This is acceptable for the current MVP shell (the
  dashboard is a scaffold with no protected data) and MUST be closed when the
  provider is wired.
