export type WorkspaceStatus = "running" | "destroyed";

export interface Workspace {
  id: string;
  status: WorkspaceStatus;
}

export interface CreateWorkspaceOptions {
  /** Optional human-readable label, e.g. the build id this preview belongs to. */
  label?: string;
}

export interface SandboxFile {
  /** Workspace-relative path, e.g. "index.html". */
  path: string;
  content: string;
}

export interface ExecResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface Preview {
  workspaceId: string;
  port: number;
  url: string;
}

export interface LogEntry {
  source: "exec" | "system";
  message: string;
}

export interface WorkspaceSnapshot {
  workspaceId: string;
  files: SandboxFile[];
}

export interface SandboxAdapter {
  createWorkspace(options?: CreateWorkspaceOptions): Promise<Workspace>;
  writeFiles(workspaceId: string, files: SandboxFile[]): Promise<void>;
  exec(workspaceId: string, command: string): Promise<ExecResult>;
  exposePreview(workspaceId: string, port: number): Promise<Preview>;
  readLogs(workspaceId: string): Promise<LogEntry[]>;
  snapshot(workspaceId: string): Promise<WorkspaceSnapshot>;
  destroyWorkspace(workspaceId: string): Promise<void>;
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Sandbox workspace not found: ${workspaceId}`);
    this.name = "WorkspaceNotFoundError";
  }
}

export class WorkspaceDestroyedError extends Error {
  constructor(workspaceId: string) {
    super(`Sandbox workspace already destroyed: ${workspaceId}`);
    this.name = "WorkspaceDestroyedError";
  }
}
