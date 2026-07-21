import { expect, test } from "@playwright/test";

// Waitlist mode is the production default (apps/web/lib/site-mode.ts fails safe
// to "waitlist"). These specs run against the waitlist dev server via the
// "waitlist" Playwright project. The live marketing specs run separately
// against the "live" project.
//
// The waitlist page is currently the minimal coming-soon stub. When #59 lands
// ComingSoonWaitlistPage and #58 lands POST /api/waitlist, extend this file with
// the email form: submit, success state, error state, optional fields.

test.describe("waitlist mode", () => {
  test("renders the coming-soon page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Coming soon");
  });

  test("does not leak live marketing content", async ({ page }) => {
    await page.goto("/");
    // Waitlist mode must never expose the live hero or the signup CTA, which
    // lead to auth/billing paths that are not ready for public traffic.
    await expect(page.getByText("Launch your business idea")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Start for free" })).toHaveCount(0);
  });
});
