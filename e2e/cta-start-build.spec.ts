import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// Issue #7: the homepage primary CTA routes into the authenticated start-build
// flow. Anonymous visitors are gated through sign-in (with their intent
// preserved); signed-in visitors go straight in.

test.describe("homepage CTA → start-build flow", () => {
  test("anonymous visitor is routed through sign-in with a preserved return path", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start for free" }).click();

    await page.waitForURL(/\/sign-in\?redirect_url=%2Fbuilds$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // Completing authentication returns to the intended start-build flow.
    await page.getByLabel("Email").fill("founder@example.com");
    await page.getByLabel("Password").fill("supersecret");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/builds");
    await expect(page.getByRole("heading", { name: "Build sessions" })).toBeVisible();
  });

  test("signed-in visitor is routed straight into the start-build flow", async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.goto("/");
    await page.getByRole("link", { name: "Start for free" }).click();

    await page.waitForURL("**/builds");
    await expect(page.getByRole("heading", { name: "Build sessions" })).toBeVisible();
  });
});
