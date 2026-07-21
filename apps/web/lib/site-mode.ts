// Single source of truth for whether the marketing homepage shows the
// waitlist placeholder or the live MarketingLandingPage (#57). Fails safe to
// "waitlist" on any unset or unrecognized value — never falls through to a
// flow that depends on auth/billing being ready.
export type SiteMode = "waitlist" | "live";

export function resolveSiteMode(env: Record<string, string | undefined>): SiteMode {
  return env.NEXT_PUBLIC_SITE_MODE?.trim() === "live" ? "live" : "waitlist";
}
