import { Sandbox } from "@vercel/sandbox";
import {
  type CreateWorkspaceOptions,
  type ExecResult,
  type LogEntry,
  type Preview,
  type SandboxAdapter,
  type SandboxFile,
  type Workspace,
  type WorkspaceSnapshot,
  WorkspaceDestroyedError,
  WorkspaceNotFoundError,
} from "./types";
import { PREVIEW_PORT } from "./static-server";

export const DEFAULT_PREVIEW_TTL_MS = 10 * 60 * 1000;

// Minimal structural surface of a live @vercel/sandbox `Sandbox` instance
// that this adapter relies on. Narrower than the SDK's real class so unit
// tests can inject a fake client with no network calls and no SDK behavior
// mocked at module level.
export interface VercelSandboxClient {
  readonly name: string;
  writeFiles(files: { path: string; content: Buffer }[]): Promise<void>;
  runCommand(params: { cmd: string; args: string[]; detached: true }): Promise<unknown>;
  domain(port: number): string;
  stop(): Promise<unknown>;
}

export type CreateSandboxParams = {
  timeout: number;
  ports: number[];
  runtime: string;
};

export type CreateSandboxFn = (params: CreateSandboxParams) => Promise<VercelSandboxClient>;

// The SDK authenticates via Vercel OIDC automatically when VERCEL_OIDC_TOKEN
// is set (the case in Vercel deployments); otherwise it requires an explicit
// token/teamId/projectId triple (local/dev), which it does NOT read from
// process.env itself, so this adapter resolves and passes them explicitly.
function resolveCredentials(): { token: string; teamId: string; projectId: string } | undefined {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && teamId && projectId) {
    return { token, teamId, projectId };
  }
  return undefined;
}

const defaultCreateSandbox: CreateSandboxFn = async (params) => {
  const credentials = resolveCredentials();
  const sandbox = credentials
    ? await Sandbox.create({ ...params, ...credentials })
    : await Sandbox.create(params);
  return sandbox;
};

export interface VercelSandboxAdapterOptions {
  createSandbox?: CreateSandboxFn;
  ttlMs?: number;
  port?: number;
}

interface InternalWorkspace {
  client: VercelSandboxClient;
  status: "running" | "destroyed";
  files: Map<string, string>;
  logs: LogEntry[];
}

export class VercelSandboxAdapter implements SandboxAdapter {
  private readonly workspaces = new Map<string, InternalWorkspace>();
  private readonly createSandbox: CreateSandboxFn;
  private readonly ttlMs: number;
  private readonly port: number;

  constructor(options?: VercelSandboxAdapterOptions) {
    this.createSandbox = options?.createSandbox ?? defaultCreateSandbox;
    this.ttlMs = options?.ttlMs ?? DEFAULT_PREVIEW_TTL_MS;
    this.port = options?.port ?? PREVIEW_PORT;
  }

  async createWorkspace(_options?: CreateWorkspaceOptions): Promise<Workspace> {
    const client = await this.createSandbox({
      timeout: this.ttlMs,
      ports: [this.port],
      runtime: "node22",
    });
    const workspace: InternalWorkspace = {
      client,
      status: "running",
      files: new Map(),
      logs: [],
    };
    this.workspaces.set(client.name, workspace);
    this.appendSystemLog(workspace, "workspace created");
    return { id: client.name, status: "running" };
  }

  async writeFiles(workspaceId: string, files: SandboxFile[]): Promise<void> {
    const workspace = this.getRunning(workspaceId);
    await workspace.client.writeFiles(
      files.map((file) => ({ path: file.path, content: Buffer.from(file.content, "utf8") })),
    );
    for (const file of files) {
      workspace.files.set(file.path, file.content);
    }
    this.appendSystemLog(workspace, `wrote ${files.length} file(s)`);
  }

  async exec(workspaceId: string, command: string): Promise<ExecResult> {
    const workspace = this.getRunning(workspaceId);
    const [cmd, ...args] = command.split(/\s+/).filter(Boolean);
    // Runs detached: the only current caller starts a long-lived static-file
    // server, and awaiting a server process would never resolve.
    await workspace.client.runCommand({ cmd, args, detached: true });
    this.appendExecLog(workspace, `ran: ${command}`);
    return { command, exitCode: 0, stdout: "", stderr: "" };
  }

  async exposePreview(workspaceId: string, port: number): Promise<Preview> {
    const workspace = this.getRunning(workspaceId);
    const preview: Preview = {
      workspaceId,
      port,
      url: workspace.client.domain(port),
    };
    this.appendSystemLog(workspace, `exposed preview on port ${port}`);
    return preview;
  }

  async readLogs(workspaceId: string): Promise<LogEntry[]> {
    const workspace = this.getExisting(workspaceId);
    return [...workspace.logs];
  }

  async snapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
    const workspace = this.getExisting(workspaceId);
    const files = [...workspace.files.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, content]) => ({ path, content }));
    return { workspaceId, files };
  }

  async destroyWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.getRunning(workspaceId);
    await workspace.client.stop();
    workspace.status = "destroyed";
    this.appendSystemLog(workspace, "workspace destroyed");
  }

  private getExisting(workspaceId: string): InternalWorkspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceNotFoundError(workspaceId);
    }
    return workspace;
  }

  private getRunning(workspaceId: string): InternalWorkspace {
    const workspace = this.getExisting(workspaceId);
    if (workspace.status === "destroyed") {
      throw new WorkspaceDestroyedError(workspaceId);
    }
    return workspace;
  }

  private appendSystemLog(workspace: InternalWorkspace, message: string): void {
    workspace.logs.push({ source: "system", message });
  }

  private appendExecLog(workspace: InternalWorkspace, message: string): void {
    workspace.logs.push({ source: "exec", message });
  }
}
