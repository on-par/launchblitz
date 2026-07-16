import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

test("empty state points a first-time founder at the start-build form", async ({
  page,
  context,
}) => {
  await signIn(context, `builds-list-empty-${Date.now()}`);
  await page.goto("/builds");

  await expect(page.getByText("No builds yet")).toBeVisible();
  const startLink = page.getByRole("link", { name: "Start your first build" });
  await expect(startLink).toBeVisible();

  await startLink.click();
  await expect(page).toHaveURL(/\/builds#idea$/);
});

test("populated list shows build details and resume lands on the live session", async ({
  page,
  context,
}) => {
  await signIn(context, `builds-list-populated-${Date.now()}`);

  await page.request.post("/api/builds", {
    data: { idea: "A launch checklist for florists" },
  });

  await page.goto("/builds");

  await expect(page.getByText("A launch checklist for florists")).toBeVisible();
  await expect(page.getByText("active")).toBeVisible();
  await expect(page.getByText("Stage: Idea")).toBeVisible();
  await expect(page.getByText(/Updated /)).toBeVisible();

  await page.getByRole("link", { name: "Resume build" }).click();
  await page.waitForURL(/\/dashboard\/builds\/[0-9a-f-]{36}/);
  await expect(page.getByText("A launch checklist for florists")).toBeVisible();
});

test("a founder never sees another founder's builds", async ({ page, context }) => {
  const userA = `builds-list-scope-a-${Date.now()}`;
  const userB = `builds-list-scope-b-${Date.now()}`;

  await signIn(context, userA);
  await page.request.post("/api/builds", {
    data: { idea: "User A's secret idea" },
  });

  await context.clearCookies();
  await signIn(context, userB);
  await page.goto("/builds");

  await expect(page.getByText("User A's secret idea")).not.toBeVisible();
  await expect(page.getByText("No builds yet")).toBeVisible();
});
