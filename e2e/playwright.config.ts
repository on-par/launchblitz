import { defineConfig } from "@playwright/test";
import path from "path";

const WEB_ROOT = path.resolve(__dirname, "..");

// Site mode is read from NEXT_PUBLIC_SITE_MODE at server start, so one server
// cannot serve both modes. Each mode gets its own dev server on its own port,
// with one Playwright project per mode pointed at it.
//
// Run a single mode:
//   npx playwright test --config e2e/playwright.config.ts --project=waitlist
//   npx playwright test --config e2e/playwright.config.ts --project=live
const LIVE_PORT = 3000;
const WAITLIST_PORT = 3001;

const SHARED_ENV = {
  PROVIDER_KEY_ENCRYPTION_KEY: "e2e-only-encryption-secret",
};

function devServer(port: number, mode: "live" | "waitlist") {
  return {
    command: `npm run dev -w @launchblitz/web -- --port ${port}`,
    cwd: WEB_ROOT,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...SHARED_ENV, NEXT_PUBLIC_SITE_MODE: mode },
  };
}

export default defineConfig({
  testDir: ".",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    channel: "chrome",
  },
  projects: [
    {
      // The live marketing site: hero, CTAs, build flow.
      name: "live",
      use: { baseURL: `http://127.0.0.1:${LIVE_PORT}` },
      testMatch: [
        "auth.spec.ts",
        "build-flow.spec.ts",
        "cta-start-build.spec.ts",
        "homepage.spec.ts",
      ],
    },
    {
      // The coming-soon / waitlist site, which is the production default.
      name: "waitlist",
      use: { baseURL: `http://127.0.0.1:${WAITLIST_PORT}` },
      testMatch: ["waitlist.spec.ts"],
    },
  ],
  webServer: [devServer(LIVE_PORT, "live"), devServer(WAITLIST_PORT, "waitlist")],
});
