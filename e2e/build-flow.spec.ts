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

test("build session renders the stage workflow", async ({ page }) => {
  await page.goto("/dashboard/builds/demo");
  await expect(page.getByText("Workflow skeleton")).toBeVisible();
});
