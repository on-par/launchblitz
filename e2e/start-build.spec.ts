import { expect, test } from "@playwright/test";
import { saveAnthropicKey } from "./support/keys";
import { signIn } from "./support/session";

test.beforeEach(async ({ context, page }) => {
  await signIn(context);
  await saveAnthropicKey(page);
});

test("starting a build persists it and lands on the session page", async ({ page }) => {
  await page.goto("/builds");
  await page.getByLabel("Your idea").fill("A tax planner for solo creators");
  await page.getByRole("button", { name: "Start new build" }).click();

  await page.waitForURL(/\/dashboard\/builds\/[0-9a-f-]{36}/);

  await expect(page.getByText("A tax planner for solo creators")).toBeVisible();
  await expect(page.getByText("Status: active")).toBeVisible();
  await expect(page.getByText("Stage: Idea")).toBeVisible();
});

test("submitting an empty idea shows guidance and stays on the builds page", async ({ page }) => {
  await page.goto("/builds");
  await page.getByRole("button", { name: "Start new build" }).click();

  await expect(page.getByText("Describe your idea before starting your build.")).toBeVisible();
  await expect(page).toHaveURL(/\/builds$/);
});
