import type { ExecResult, SandboxAdapter, SandboxFile } from "./types";
import { PREVIEW_PORT, STATIC_SERVER_COMMAND, STATIC_SERVER_FILE, STATIC_SERVER_SCRIPT } from "./static-server";

export interface StaticPreview {
  workspaceId: string;
  url: string;
  expiresAt: string;
}

export type PreviewStartPhase = "creating-workspace" | "writing-files" | "starting-server";

export interface PreviewStartProgressEvent {
  phase: PreviewStartPhase;
  workspaceId: string | null;
}

export interface StartStaticSitePreviewOptions {
  files: SandboxFile[];
  label?: string;
  ttlMs: number;
  now: Date;
  onProgress?: (event: PreviewStartProgressEvent) => void;
}

export class PreviewServeError extends Error {
  readonly workspaceId: string;
  readonly result: ExecResult;

  constructor(workspaceId: string, result: ExecResult) {
    super(`Preview server command failed with exit code ${result.exitCode}: ${result.command}`);
    this.name = "PreviewServeError";
    this.workspaceId = workspaceId;
    this.result = result;
  }
}

// Provider-neutral orchestration over a SandboxAdapter: create a workspace,
// write the static site plus the dependency-free server script, start the
// server, and expose it. Takes generic SandboxFile[] (rather than the
// landing-page artifact type) to keep @launchblitz/sandbox free of a
// @launchblitz/workflow dependency.
export async function startStaticSitePreview(
  adapter: SandboxAdapter,
  options: StartStaticSitePreviewOptions,
): Promise<StaticPreview> {
  options.onProgress?.({ phase: "creating-workspace", workspaceId: null });
  const workspace = await adapter.createWorkspace({ label: options.label });

  options.onProgress?.({ phase: "writing-files", workspaceId: workspace.id });
  await adapter.writeFiles(workspace.id, [
    ...options.files,
    { path: STATIC_SERVER_FILE, content: STATIC_SERVER_SCRIPT },
  ]);

  options.onProgress?.({ phase: "starting-server", workspaceId: workspace.id });
  const result = await adapter.exec(workspace.id, STATIC_SERVER_COMMAND);
  if (result.exitCode !== 0) {
    throw new PreviewServeError(workspace.id, result);
  }

  const preview = await adapter.exposePreview(workspace.id, PREVIEW_PORT);

  return {
    workspaceId: workspace.id,
    url: preview.url,
    expiresAt: new Date(options.now.getTime() + options.ttlMs).toISOString(),
  };
}
