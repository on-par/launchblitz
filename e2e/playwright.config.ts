import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: ".",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
  },
  webServer: {
    command: "npm run dev -w @launchblitz/web",
    cwd: path.resolve(__dirname, ".."),
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PROVIDER_KEY_ENCRYPTION_KEY: "e2e-only-encryption-secret" },
  },
});
