import { expect, test } from "@playwright/test";

// Waitlist mode is the production default (apps/web/lib/site-mode.ts fails safe
// to "waitlist"). These specs run against the waitlist dev server via the
// "waitlist" Playwright project. The live marketing specs run separately
// against the "live" project.
//
// The waitlist page renders ComingSoonWaitlistPage (#59): hero, wired
// waitlist form backed by POST /api/waitlist (#58), how-it-works, FAQ, and a
// wordmark-only footer.

test.describe("waitlist mode", () => {
  test("renders the coming-soon page", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("Launch your business idea.");
    await expect(heading).toContainText("Coming soon.");
  });

  test("does not leak live marketing content", async ({ page }) => {
    await page.goto("/");
    // Waitlist mode must never expose live-only surfaces: pricing, or links
    // into auth/billing/app routes that are not ready for public traffic.
    await expect(page.getByRole("link", { name: "Start for free" })).toHaveCount(0);
    await expect(page.getByText("$29/mo")).toHaveCount(0);
    await expect(page.getByText("Simple. Cancel anytime.")).toHaveCount(0);

    for (const path of ["/sign-in", "/sign-up", "/builds", "/dashboard", "/settings"]) {
      await expect(page.locator(`a[href^="${path}"]`)).toHaveCount(0);
    }
  });

  test("shows the hero copy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Founder's SaaS platform")).toBeVisible();
    await expect(
      page.getByText(
        "LaunchBlitz turns one raw idea into research, positioning, copy, and a Lovable-ready launch packet in a single guided session. We're finishing the guided workflow before opening it up. Join the waitlist and we'll email you the moment it's ready.",
      ),
    ).toBeVisible();
  });

  test("shows how it works and the deliverables", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your idea")).toBeVisible();
    await expect(page.getByText("Guided research")).toBeVisible();
    await expect(page.getByText("Review, approve, launch")).toBeVisible();

    for (const deliverable of [
      "Market Validation",
      "Customer Avatar",
      "Copy Deck",
      "Landing Page Export",
      "Launch Kit",
    ]) {
      await expect(page.getByText(deliverable, { exact: true })).toBeVisible();
    }
  });

  test("shows the FAQ", async ({ page }) => {
    await page.goto("/");
    for (const question of [
      "What is LaunchBlitz?",
      "When does it launch?",
      "What will it cost?",
      "What AI keys do I need?",
      "Is my data private?",
    ]) {
      await expect(page.getByText(question)).toBeVisible();
    }
  });

  test("shows a wordmark-only footer with no terms/privacy links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /terms/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /privacy/i })).toHaveCount(0);
    await expect(page.locator("footer").getByAltText("LaunchBlitz")).toBeVisible();
  });

  test("submits the waitlist form successfully", async ({ page }) => {
    let requestedEmail: string | undefined;
    await page.route("**/api/waitlist", (route) => {
      requestedEmail = route.request().postDataJSON()?.email;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok" }),
      });
    });

    await page.goto("/");
    await page.getByLabel("Email address").fill("founder@example.com");
    await page.getByRole("button", { name: "Join the waitlist" }).click();

    await expect(page.getByText("You're on the list.")).toBeVisible();
    expect(requestedEmail).toBe("founder@example.com");
  });

  test("shows an error when the waitlist submission fails", async ({ page }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({}) }),
    );

    await page.goto("/");
    await page.getByLabel("Email address").fill("founder@example.com");
    await page.getByRole("button", { name: "Join the waitlist" }).click();

    await expect(page.getByText("That didn't go through. Try again in a moment.")).toBeVisible();
    await expect(page).toHaveURL("/");
    await expect(page.getByLabel("Email address")).toBeVisible();
  });
});
