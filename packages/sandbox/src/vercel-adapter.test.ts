import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREVIEW_TTL_MS, VercelSandboxAdapter, type CreateSandboxFn, type VercelSandboxClient } from "./vercel-adapter";
import { WorkspaceDestroyedError, WorkspaceNotFoundError } from "./types";

function createFakeClient(name: string): VercelSandboxClient & {
  writeFiles: ReturnType<typeof vi.fn>;
  runCommand: ReturnType<typeof vi.fn>;
  domain: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
} {
  return {
    name,
    writeFiles: vi.fn().mockResolvedValue(undefined),
    runCommand: vi.fn().mockResolvedValue(undefined),
    domain: vi.fn((port: number) => `https://${name}-${port}.vercel.run`),
    stop: vi.fn().mockResolvedValue(undefined),
  };
}

function fakeCreateSandbox(client: VercelSandboxClient): CreateSandboxFn {
  return vi.fn().mockResolvedValue(client);
}

describe("VercelSandboxAdapter", () => {
  it("passes timeout, ports, and runtime to createSandbox", async () => {
    const client = createFakeClient("sbx-1");
    const createSandbox = fakeCreateSandbox(client);
    const adapter = new VercelSandboxAdapter({ createSandbox, ttlMs: 60_000, port: 4000 });

    const workspace = await adapter.createWorkspace();

    expect(createSandbox).toHaveBeenCalledWith({ timeout: 60_000, ports: [4000], runtime: "node22" });
    expect(workspace).toEqual({ id: "sbx-1", status: "running" });
  });

  it("defaults ttlMs to DEFAULT_PREVIEW_TTL_MS", async () => {
    const client = createFakeClient("sbx-default");
    const createSandbox = fakeCreateSandbox(client);
    const adapter = new VercelSandboxAdapter({ createSandbox });

    await adapter.createWorkspace();

    expect(createSandbox).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: DEFAULT_PREVIEW_TTL_MS }),
    );
  });

  it("converts file contents to Buffer and preserves paths on writeFiles", async () => {
    const client = createFakeClient("sbx-2");
    const adapter = new VercelSandboxAdapter({ createSandbox: fakeCreateSandbox(client) });
    const workspace = await adapter.createWorkspace();

    await adapter.writeFiles(workspace.id, [
      { path: "index.html", content: "<html></html>" },
      { path: "metadata.json", content: "{}" },
    ]);

    expect(client.writeFiles).toHaveBeenCalledWith([
      { path: "index.html", content: Buffer.from("<html></html>", "utf8") },
      { path: "metadata.json", content: Buffer.from("{}", "utf8") },
    ]);
  });

  it("splits the exec command into cmd/args and runs it detached", async () => {
    const client = createFakeClient("sbx-3");
    const adapter = new VercelSandboxAdapter({ createSandbox: fakeCreateSandbox(client) });
    const workspace = await adapter.createWorkspace();

    const result = await adapter.exec(workspace.id, "node launchblitz-preview-server.mjs");

    expect(client.runCommand).toHaveBeenCalledWith({
      cmd: "node",
      args: ["launchblitz-preview-server.mjs"],
      detached: true,
    });
    expect(result).toEqual({
      command: "node launchblitz-preview-server.mjs",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
  });

  it("returns the client's domain(port) as the preview url", async () => {
    const client = createFakeClient("sbx-4");
    const adapter = new VercelSandboxAdapter({ createSandbox: fakeCreateSandbox(client) });
    const workspace = await adapter.createWorkspace();

    const preview = await adapter.exposePreview(workspace.id, 3000);

    expect(client.domain).toHaveBeenCalledWith(3000);
    expect(preview).toEqual({ workspaceId: workspace.id, port: 3000, url: "https://sbx-4-3000.vercel.run" });
  });

  it("returns snapshot files sorted by path", async () => {
    const client = createFakeClient("sbx-5");
    const adapter = new VercelSandboxAdapter({ createSandbox: fakeCreateSandbox(client) });
    const workspace = await adapter.createWorkspace();

    await adapter.writeFiles(workspace.id, [
      { path: "b.txt", content: "b" },
      { path: "a.txt", content: "a" },
    ]);

    const snapshot = await adapter.snapshot(workspace.id);
    expect(snapshot.files).toEqual([
      { path: "a.txt", content: "a" },
      { path: "b.txt", content: "b" },
    ]);
  });

  it("stops the underlying sandbox and rejects further exec with WorkspaceDestroyedError", async () => {
    const client = createFakeClient("sbx-6");
    const adapter = new VercelSandboxAdapter({ createSandbox: fakeCreateSandbox(client) });
    const workspace = await adapter.createWorkspace();

    await adapter.destroyWorkspace(workspace.id);

    expect(client.stop).toHaveBeenCalled();
    await expect(adapter.exec(workspace.id, "echo hi")).rejects.toThrow(WorkspaceDestroyedError);
  });

  it("throws WorkspaceNotFoundError for an unknown workspace id", async () => {
    const adapter = new VercelSandboxAdapter({ createSandbox: fakeCreateSandbox(createFakeClient("unused")) });

    await expect(adapter.exec("unknown-id", "echo hi")).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.writeFiles("unknown-id", [])).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.exposePreview("unknown-id", 3000)).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.snapshot("unknown-id")).rejects.toThrow(WorkspaceNotFoundError);
    await expect(adapter.destroyWorkspace("unknown-id")).rejects.toThrow(WorkspaceNotFoundError);
  });
});
