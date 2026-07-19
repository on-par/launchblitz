import { describe, expect, it } from "vitest";
import { InMemorySandboxAdapter } from "./in-memory-adapter";
import { WorkspaceDestroyedError, WorkspaceNotFoundError, type SandboxAdapter } from "./types";

describe("InMemorySandboxAdapter", () => {
  it("runs a generated artifact end to end", async () => {
    const adapter: SandboxAdapter = new InMemorySandboxAdapter();

    const workspace = await adapter.createWorkspace();
    expect(workspace.id).toBe("ws-1");
    expect(typeof workspace.id).toBe("string");
    expect(workspace.id.length).toBeGreaterThan(0);

    await adapter.writeFiles(workspace.id, [{ path: "index.html", content: "<html>hello</html>" }]);
    const execResult = await adapter.exec(workspace.id, "npx serve .");
    expect(execResult.exitCode).toBe(0);
    expect(execResult.command).toBe("npx serve .");

    const preview = await adapter.exposePreview(workspace.id, 3000);
    expect(typeof preview.url).toBe("string");
    expect(preview.url.length).toBeGreaterThan(0);
    expect(preview.url).toContain(workspace.id);

    const logs = await adapter.readLogs(workspace.id);
    expect(logs.some((entry) => entry.message.includes("wrote 1 file"))).toBe(true);
    expect(logs.some((entry) => entry.message.includes("npx serve ."))).toBe(true);
  });

  it("tears down a workspace and reflects it in state and logs", async () => {
    const adapter = new InMemorySandboxAdapter();
    const workspace = await adapter.createWorkspace();
    await adapter.exposePreview(workspace.id, 3000);

    await adapter.destroyWorkspace(workspace.id);

    expect(adapter.getWorkspace(workspace.id).status).toBe("destroyed");
    expect(adapter.activePreviews(workspace.id)).toEqual([]);

    const logs = await adapter.readLogs(workspace.id);
    expect(logs.some((entry) => entry.message.toLowerCase().includes("destroy"))).toBe(true);
  });

  it("rejects operations on an unknown workspace id with WorkspaceNotFoundError", async () => {
    const adapter = new InMemorySandboxAdapter();

    await expect(adapter.exec("ws-999", "echo hi")).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.readLogs("ws-999")).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.writeFiles("ws-999", [])).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.exposePreview("ws-999", 3000)).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.snapshot("ws-999")).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.destroyWorkspace("ws-999")).rejects.toThrow(WorkspaceNotFoundError);
  });

  it("rejects mutating operations on a destroyed workspace but still allows inspection", async () => {
    const adapter = new InMemorySandboxAdapter();
    const workspace = await adapter.createWorkspace();
    await adapter.destroyWorkspace(workspace.id);

    await expect(adapter.exec(workspace.id, "echo hi")).rejects.toThrow(WorkspaceDestroyedError);
    await expect(adapter.writeFiles(workspace.id, [])).rejects.toThrow(WorkspaceDestroyedError);
    await expect(adapter.exposePreview(workspace.id, 3000)).rejects.toThrow(WorkspaceDestroyedError);
    await expect(adapter.destroyWorkspace(workspace.id)).rejects.toThrow(WorkspaceDestroyedError);

    await expect(adapter.readLogs(workspace.id)).resolves.toBeDefined();
    await expect(adapter.snapshot(workspace.id)).resolves.toBeDefined();
  });

  it("returns snapshot files sorted by path, with later writes overwriting earlier ones", async () => {
    const adapter = new InMemorySandboxAdapter();
    const workspace = await adapter.createWorkspace();

    await adapter.writeFiles(workspace.id, [
      { path: "b.txt", content: "b" },
      { path: "a.txt", content: "a-first" },
    ]);
    await adapter.writeFiles(workspace.id, [{ path: "a.txt", content: "a-second" }]);

    const snapshot = await adapter.snapshot(workspace.id);
    expect(snapshot.workspaceId).toBe(workspace.id);
    expect(snapshot.files).toEqual([
      { path: "a.txt", content: "a-second" },
      { path: "b.txt", content: "b" },
    ]);
  });

  it("lets onExec script a failing command result", async () => {
    const adapter = new InMemorySandboxAdapter({
      onExec: () => ({ exitCode: 1, stderr: "boom" }),
    });
    const workspace = await adapter.createWorkspace();

    const result = await adapter.exec(workspace.id, "npm run build");

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("boom");
    expect(result.command).toBe("npm run build");
  });

  it("mints deterministic, monotonically increasing workspace ids per instance", async () => {
    const adapter = new InMemorySandboxAdapter();
    const first = await adapter.createWorkspace();
    const second = await adapter.createWorkspace();

    expect(first.id).toBe("ws-1");
    expect(second.id).toBe("ws-2");
  });
});
