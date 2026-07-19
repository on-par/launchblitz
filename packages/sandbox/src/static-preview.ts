import type { SandboxAdapter, SandboxFile } from "./types";
import { PREVIEW_PORT, STATIC_SERVER_COMMAND, STATIC_SERVER_FILE, STATIC_SERVER_SCRIPT } from "./static-server";

export interface StaticPreview {
  workspaceId: string;
  url: string;
  expiresAt: string;
}

export interface StartStaticSitePreviewOptions {
  files: SandboxFile[];
  label?: string;
  ttlMs: number;
  now: Date;
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
  const workspace = await adapter.createWorkspace({ label: options.label });
  await adapter.writeFiles(workspace.id, [
    ...options.files,
    { path: STATIC_SERVER_FILE, content: STATIC_SERVER_SCRIPT },
  ]);
  await adapter.exec(workspace.id, STATIC_SERVER_COMMAND);
  const preview = await adapter.exposePreview(workspace.id, PREVIEW_PORT);

  return {
    workspaceId: workspace.id,
    url: preview.url,
    expiresAt: new Date(options.now.getTime() + options.ttlMs).toISOString(),
  };
}
