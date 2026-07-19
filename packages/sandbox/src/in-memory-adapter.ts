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

interface InternalWorkspace {
  id: string;
  label?: string;
  status: "running" | "destroyed";
  files: Map<string, string>;
  commands: string[];
  previews: Preview[];
  logs: LogEntry[];
}

export interface InMemorySandboxAdapterOptions {
  onExec?: (workspaceId: string, command: string) => Partial<Omit<ExecResult, "command">>;
}

export class InMemorySandboxAdapter implements SandboxAdapter {
  private readonly workspaces = new Map<string, InternalWorkspace>();
  private readonly onExec?: InMemorySandboxAdapterOptions["onExec"];
  private nextId = 1;

  constructor(options?: InMemorySandboxAdapterOptions) {
    this.onExec = options?.onExec;
  }

  async createWorkspace(options?: CreateWorkspaceOptions): Promise<Workspace> {
    const id = `ws-${this.nextId++}`;
    const workspace: InternalWorkspace = {
      id,
      label: options?.label,
      status: "running",
      files: new Map(),
      commands: [],
      previews: [],
      logs: [],
    };
    this.workspaces.set(id, workspace);
    this.appendSystemLog(workspace, "workspace created");
    return { id: workspace.id, status: workspace.status };
  }

  async writeFiles(workspaceId: string, files: SandboxFile[]): Promise<void> {
    const workspace = this.getRunning(workspaceId);
    for (const file of files) {
      workspace.files.set(file.path, file.content);
    }
    this.appendSystemLog(workspace, `wrote ${files.length} file(s)`);
  }

  async exec(workspaceId: string, command: string): Promise<ExecResult> {
    const workspace = this.getRunning(workspaceId);
    workspace.commands.push(command);
    const partial = this.onExec?.(workspaceId, command) ?? {};
    const result: ExecResult = {
      command,
      exitCode: 0,
      stdout: "",
      stderr: "",
      ...partial,
    };
    this.appendExecLog(workspace, `ran: ${command}`);
    if (result.stdout) {
      this.appendExecLog(workspace, result.stdout);
    }
    if (result.stderr) {
      this.appendExecLog(workspace, result.stderr);
    }
    return result;
  }

  async exposePreview(workspaceId: string, port: number): Promise<Preview> {
    const workspace = this.getRunning(workspaceId);
    const preview: Preview = {
      workspaceId,
      port,
      url: `http://sandbox.local/${workspaceId}/${port}`,
    };
    workspace.previews.push(preview);
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
    workspace.status = "destroyed";
    workspace.previews = [];
    this.appendSystemLog(workspace, "workspace destroyed");
  }

  activePreviews(workspaceId: string): Preview[] {
    const workspace = this.getExisting(workspaceId);
    return workspace.status === "destroyed" ? [] : [...workspace.previews];
  }

  getWorkspace(workspaceId: string): Workspace {
    const workspace = this.getExisting(workspaceId);
    return { id: workspace.id, status: workspace.status };
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
