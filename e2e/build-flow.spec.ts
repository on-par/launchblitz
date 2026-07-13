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

test("launch packet preview compiles approved outputs and flags gaps", async ({ page }) => {
  await page.goto("/dashboard/builds/demo/packet");
  await expect(page.getByText("Launch packet preview")).toBeVisible();
  await expect(page.getByText("Creator-economy tax tooling is underserved")).toBeVisible(); // edited wins
  await expect(page.getByText("Solo creator earning $60k+")).toBeVisible(); // raw fallback
  await expect(page.getByText("Draft headline pending review")).not.toBeVisible(); // draft excluded
  await expect(page.getByText("Missing required sections")).toBeVisible();
  // "Launch Kit" / "Landing Page Export" each appear twice (missing-sections
  // callout + section card heading), so .first() avoids a strict-mode
  // violation while still proving the title renders.
  await expect(page.getByText("Launch Kit").first()).toBeVisible();
  await expect(page.getByText("Landing Page Export").first()).toBeVisible();
});
