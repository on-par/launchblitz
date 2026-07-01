import { expect, test } from "@playwright/test";

// Issue #6: homepage copy must reflect the MVP ("idea -> Lovable-ready launch
// packet") and drop unnecessary provider-branded marketing.

test.describe("homepage MVP messaging", () => {
  test("frames the output as a Lovable-ready launch packet", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Lovable-ready launch packet")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Launch packet", exact: true })).toBeVisible();
  });

  test("does not advertise specific AI providers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Powered by")).toHaveCount(0);
    for (const provider of ["OpenAI", "Anthropic", "Perplexity"]) {
      await expect(page.getByText(provider, { exact: false })).toHaveCount(0);
    }
  });
});
