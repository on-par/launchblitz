import type { LogEntry } from "./types";

export type PreviewProgressPhase =
  | "creating-workspace"
  | "writing-files"
  | "starting-server"
  | "ready"
  | "failed";

export interface PreviewProgress {
  buildId: string;
  phase: PreviewProgressPhase;
  workspaceId: string | null;
  logs: LogEntry[];
  error: string | null;
}

// In-memory registry of preview startup progress, mirroring InMemoryPreviewStore's
// rationale: previews and their progress are ephemeral by design, and losing them
// on restart only means the founder starts again — no DB migration needed.
export class InMemoryPreviewProgressStore {
  private readonly records = new Map<string, PreviewProgress>();

  begin(buildId: string): void {
    this.records.set(buildId, {
      buildId,
      phase: "creating-workspace",
      workspaceId: null,
      logs: [],
      error: null,
    });
  }

  setPhase(buildId: string, phase: PreviewProgressPhase, workspaceId?: string): void {
    const existing = this.records.get(buildId);
    this.records.set(buildId, {
      buildId,
      phase,
      workspaceId: workspaceId ?? existing?.workspaceId ?? null,
      logs: existing?.logs ?? [],
      error: existing?.error ?? null,
    });
  }

  markReady(buildId: string, logs: LogEntry[]): void {
    const existing = this.records.get(buildId);
    this.records.set(buildId, {
      buildId,
      phase: "ready",
      workspaceId: existing?.workspaceId ?? null,
      logs: [...logs],
      error: null,
    });
  }

  markFailed(buildId: string, error: string, logs: LogEntry[]): void {
    const existing = this.records.get(buildId);
    this.records.set(buildId, {
      buildId,
      phase: "failed",
      workspaceId: existing?.workspaceId ?? null,
      logs: [...logs],
      error,
    });
  }

  get(buildId: string): PreviewProgress | null {
    const record = this.records.get(buildId);
    if (!record) {
      return null;
    }
    return { ...record, logs: [...record.logs] };
  }
}
