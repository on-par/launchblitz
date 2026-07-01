import { expect, test } from "@playwright/test";

test("landing page shows the MVP hero and primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Launch your business idea",
  );
  await expect(page.getByRole("button", { name: "Start for free" })).toBeVisible();
});
