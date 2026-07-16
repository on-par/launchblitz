import { expect, test } from "@playwright/test";
import { saveAnthropicKey } from "./support/keys";
import { signIn } from "./support/session";

test("blocked path: missing key locks the start action and deep-links to the key vault and back", async ({
  page,
  context,
}) => {
  await signIn(context, `readiness-blocked-${Date.now()}`);
  await page.goto("/builds");

  await expect(page.getByText("Anthropic key missing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start new build" })).toBeDisabled();
  await expect(page.getByText("Start is locked")).toBeVisible();

  await page.getByRole("link", { name: "Add key in Key vault" }).click();
  await expect(page).toHaveURL(/\/settings\/keys\?returnTo=\/builds$/);

  const backLink = page.getByRole("link", { name: "← Back to your build" });
  await expect(backLink).toBeVisible();
  await expect(backLink).toHaveAttribute("href", "/builds");
});

test("ready path: saved key unlocks the start action and shows readiness on the session page", async ({
  page,
  context,
}) => {
  await signIn(context, `readiness-ready-${Date.now()}`);
  await saveAnthropicKey(page);

  await page.goto("/builds");
  await expect(page.getByText("Anthropic key ready")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start new build" })).toBeEnabled();

  await page.getByLabel("Your idea").fill("A tax planner for solo creators");
  await page.getByRole("button", { name: "Start new build" }).click();
  await page.waitForURL(/\/dashboard\/builds\/[0-9a-f-]{36}/);

  await expect(page.getByText("Anthropic key ready")).toBeVisible();
});
