import { expect, test } from "@playwright/test";

test("dashboard shell renders build sessions", async ({ page }) => {
  await page.goto("/builds");
  await expect(page.getByRole("heading", { name: "Build sessions" })).toBeVisible();
});

test("/dashboard redirects to the builds list", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/builds$/);
  await expect(page.getByRole("heading", { name: "Build sessions" })).toBeVisible();
});

test("founder creates a build from an idea and lands on the session", async ({ page }) => {
  await page.goto("/builds/new");

  const idea = "A subscription box of small-batch hot sauces for spicy food lovers";
  await page.getByLabel("Your idea").fill(idea);
  await page.getByRole("button", { name: "Create build" }).click();

  await expect(page).toHaveURL(/\/dashboard\/builds\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: "Idea capture" })).toBeVisible();
  await expect(page.getByText(idea)).toBeVisible();

  // The session URL renders on a direct visit / refresh, not just as the tail of
  // the create flow (guards the ownership-scoped server fetch).
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Idea capture" })).toBeVisible();
  await expect(page.getByText(idea)).toBeVisible();
});

test("empty idea submission is rejected with guidance", async ({ page }) => {
  await page.goto("/builds/new");

  await page.getByRole("button", { name: "Create build" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/builds\/new$/);
});
