import { expect, test } from "@playwright/test";

test("dashboard shell renders build sessions", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Build sessions")).toBeVisible();
});

test("build session renders the stage workflow", async ({ page }) => {
  await page.goto("/dashboard/builds/demo");
  await expect(page.getByText("Workflow skeleton")).toBeVisible();
});
