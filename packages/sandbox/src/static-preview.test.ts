import { describe, expect, it } from "vitest";
import { InMemorySandboxAdapter } from "./in-memory-adapter";
import { startStaticSitePreview } from "./static-preview";
import { STATIC_SERVER_COMMAND, STATIC_SERVER_FILE } from "./static-server";

describe("startStaticSitePreview", () => {
  it("writes the site files plus the server script, runs the server, and returns the preview url", async () => {
    const adapter = new InMemorySandboxAdapter();
    const now = new Date("2026-07-19T12:00:00.000Z");

    const result = await startStaticSitePreview(adapter, {
      files: [{ path: "index.html", content: "<html>hi</html>" }],
      label: "build-1",
      ttlMs: 10 * 60 * 1000,
      now,
    });

    const snapshot = await adapter.snapshot(result.workspaceId);
    expect(snapshot.files.map((file) => file.path)).toEqual(
      [STATIC_SERVER_FILE, "index.html"].sort(),
    );

    const logs = await adapter.readLogs(result.workspaceId);
    expect(logs.some((entry) => entry.message.includes(STATIC_SERVER_COMMAND))).toBe(true);

    expect(result.url).toContain(result.workspaceId);
    expect(result.expiresAt).toBe(new Date(now.getTime() + 10 * 60 * 1000).toISOString());
  });
});
