export interface PreviewRecord {
  buildId: string;
  workspaceId: string;
  url: string;
  expiresAt: string;
  revisionNumber: number;
}

// In-memory registry of active previews. No DB migration: previews are
// ephemeral by design, and losing them on restart only means the founder
// clicks "Start preview" again — the smallest correct persistence for this.
export class InMemoryPreviewStore {
  private readonly records = new Map<string, PreviewRecord>();

  set(record: PreviewRecord): void {
    this.pruneExpired();
    this.records.set(record.buildId, record);
  }

  getActive(buildId: string, now: Date): PreviewRecord | null {
    const record = this.records.get(buildId);
    if (!record) {
      return null;
    }
    if (new Date(record.expiresAt).getTime() <= now.getTime()) {
      return null;
    }
    return record;
  }

  // Needed so a restart doesn't leave the status route reporting the old
  // preview as ready mid-restart.
  delete(buildId: string): void {
    this.records.delete(buildId);
  }

  // Opportunistic cleanup so a long-running process doesn't accumulate one
  // permanent entry per distinct build that ever started a preview.
  private pruneExpired(): void {
    const now = Date.now();
    for (const [buildId, record] of this.records) {
      if (new Date(record.expiresAt).getTime() <= now) {
        this.records.delete(buildId);
      }
    }
  }
}
