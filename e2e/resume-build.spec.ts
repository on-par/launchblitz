import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

test("leaving and returning to a build resumes at the same stage with restored state", async ({
  page,
  context,
}) => {
  await signIn(context, `resume-${Date.now()}`);

  await page.request.post("/api/builds", {
    data: { idea: "A launch checklist for florists" },
  });

  await page.goto("/builds");
  await page.getByRole("link", { name: "Resume build" }).click();
  await page.waitForURL(/\/dashboard\/builds\/[0-9a-f-]{36}/);
  await expect(page.getByText("A launch checklist for florists")).toBeVisible();
  await expect(page.getByText("Resume from: Idea")).toBeVisible();

  await page.goto("/dashboard");

  await page.goto("/builds");
  await page.getByRole("link", { name: "Resume build" }).click();
  await page.waitForURL(/\/dashboard\/builds\/[0-9a-f-]{36}/);
  await expect(page.getByText("A launch checklist for florists")).toBeVisible();
  await expect(page.getByText("Resume from: Idea")).toBeVisible();
});
