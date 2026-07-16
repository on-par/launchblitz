import type { Page } from "@playwright/test";

export async function saveAnthropicKey(page: Page) {
  const res = await page.request.put("/api/keys", {
    data: { provider: "anthropic", key: "sk-ant-e2e-readiness-key" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed anthropic key: ${res.status()}`);
  }
}
