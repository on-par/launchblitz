import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// The dashboard shell is behind the session gate (issue #7), so these tests
// authenticate before visiting the signed-in surface.
test.beforeEach(async ({ context }) => {
  await signIn(context);
});

test("dashboard shell renders build sessions", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Build sessions")).toBeVisible();
});

test("unknown build shows not found", async ({ page }) => {
  const response = await page.goto("/dashboard/builds/demo");
  expect(response?.status()).toBe(404);
});
