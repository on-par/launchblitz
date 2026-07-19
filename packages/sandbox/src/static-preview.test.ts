import { describe, expect, it } from "vitest";
import { InMemorySandboxAdapter } from "./in-memory-adapter";
import { PreviewServeError, startStaticSitePreview, type PreviewStartProgressEvent } from "./static-preview";
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

  it("reports progress phases in order with the workspace id once created", async () => {
    const adapter = new InMemorySandboxAdapter();
    const events: PreviewStartProgressEvent[] = [];

    const result = await startStaticSitePreview(adapter, {
      files: [{ path: "index.html", content: "<html>hi</html>" }],
      label: "build-1",
      ttlMs: 10 * 60 * 1000,
      now: new Date("2026-07-19T12:00:00.000Z"),
      onProgress: (event) => events.push(event),
    });

    expect(events).toEqual([
      { phase: "creating-workspace", workspaceId: null },
      { phase: "writing-files", workspaceId: result.workspaceId },
      { phase: "starting-server", workspaceId: result.workspaceId },
    ]);
  });

  it("throws PreviewServeError when the serve command exits non-zero", async () => {
    const adapter = new InMemorySandboxAdapter({
      onExec: () => ({ exitCode: 1, stderr: "node: command not found" }),
    });

    const promise = startStaticSitePreview(adapter, {
      files: [{ path: "index.html", content: "<html>hi</html>" }],
      label: "build-1",
      ttlMs: 10 * 60 * 1000,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    await expect(promise).rejects.toThrow(PreviewServeError);

    let workspaceId = "";
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewServeError);
      const serveError = error as PreviewServeError;
      workspaceId = serveError.workspaceId;
      expect(serveError.workspaceId).toBe("ws-1");
      expect(serveError.result.exitCode).toBe(1);
    }

    expect(adapter.activePreviews(workspaceId)).toEqual([]);
  });
});
