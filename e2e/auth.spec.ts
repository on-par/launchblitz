import { expect, test } from "@playwright/test";

test("landing page exposes auth entrypoints", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Build a business in one session.")).toBeVisible();
});
