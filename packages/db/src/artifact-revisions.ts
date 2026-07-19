import { and, desc, eq } from "drizzle-orm";
import { artifactRevisions, builds } from "./schema";
import type { Db } from "./provider-keys/repository";
import { UUID_PATTERN } from "./uuid";

export const EDIT_REQUEST_MAX_LENGTH = 2_000;

export type EditRequestValidation = { ok: true; value: string } | { ok: false; error: string };

/** Validate a founder's preview change request before it creates a revision. */
export function validateEditRequest(raw: unknown): EditRequestValidation {
  if (typeof raw !== "string") {
    return { ok: false, error: "Describe the change you want before submitting." };
  }

  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, error: "Describe the change you want before submitting." };
  }

  if (value.length > EDIT_REQUEST_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep your change request under ${EDIT_REQUEST_MAX_LENGTH} characters.`,
    };
  }

  return { ok: true, value };
}

/** Structural snapshot of a generated artifact; LandingPageArtifact from @launchblitz/workflow is assignable to it (keeps db free of a workflow dependency). */
export interface ArtifactRevisionArtifact {
  formatVersion: number;
  files: Array<{ path: string; contents: string }>;
}

export interface ArtifactRevisionRecord {
  id: string;
  buildId: string;
  revisionNumber: number;
  editRequest: string | null;
  artifact: ArtifactRevisionArtifact;
  createdAt: Date | null;
}

export interface CreateArtifactRevisionInput {
  buildId: string;
  editRequest: string | null;
  artifact: ArtifactRevisionArtifact;
}

/**
 * Persistence boundary for artifact revisions. Implemented by
 * {@link DrizzleArtifactRevisionsRepository} for real Postgres and
 * {@link InMemoryArtifactRevisionsRepository} for tests and local runs
 * without a database configured.
 */
export interface ArtifactRevisionsRepository {
  /** Insert the next revision (revisionNumber = latest + 1, or 1). Ownership-gated: null when the build isn't the user's. */
  createForUser(
    input: CreateArtifactRevisionInput,
    userId: string,
  ): Promise<ArtifactRevisionRecord | null>;
  /** Ownership-gated history, ordered by revisionNumber ascending. Empty when not owned. */
  listForUser(buildId: string, userId: string): Promise<ArtifactRevisionRecord[]>;
  /** Highest-numbered revision, or null when none / not owned. */
  getLatestForUser(buildId: string, userId: string): Promise<ArtifactRevisionRecord | null>;
}

type ArtifactRevisionRow = typeof artifactRevisions.$inferSelect;

function toRecord(row: ArtifactRevisionRow): ArtifactRevisionRecord {
  return {
    id: row.id,
    buildId: row.buildId ?? "",
    revisionNumber: row.revisionNumber,
    editRequest: row.editRequest ?? null,
    // The repository is the only writer of this column, so the shape is guaranteed.
    artifact: row.artifact as ArtifactRevisionArtifact,
    createdAt: row.createdAt ?? null,
  };
}

/** Drizzle/Postgres-backed repository used at runtime when DATABASE_URL is set. */
export class DrizzleArtifactRevisionsRepository implements ArtifactRevisionsRepository {
  constructor(private readonly db: Db) {}

  private async isOwnedByUser(buildId: string, userId: string): Promise<boolean> {
    if (!UUID_PATTERN.test(buildId)) {
      return false;
    }
    const [row] = await this.db
      .select()
      .from(builds)
      .where(and(eq(builds.id, buildId), eq(builds.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  private async latestRow(buildId: string): Promise<ArtifactRevisionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(artifactRevisions)
      .where(eq(artifactRevisions.buildId, buildId))
      .orderBy(desc(artifactRevisions.revisionNumber))
      .limit(1);
    return row;
  }

  async createForUser(
    input: CreateArtifactRevisionInput,
    userId: string,
  ): Promise<ArtifactRevisionRecord | null> {
    if (!(await this.isOwnedByUser(input.buildId, userId))) {
      return null;
    }
    const latest = await this.latestRow(input.buildId);
    const [row] = await this.db
      .insert(artifactRevisions)
      .values({
        buildId: input.buildId,
        revisionNumber: (latest?.revisionNumber ?? 0) + 1,
        editRequest: input.editRequest,
        artifact: input.artifact,
      })
      .returning();
    return toRecord(row);
  }

  async listForUser(buildId: string, userId: string): Promise<ArtifactRevisionRecord[]> {
    if (!(await this.isOwnedByUser(buildId, userId))) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(artifactRevisions)
      .where(eq(artifactRevisions.buildId, buildId))
      .orderBy(artifactRevisions.revisionNumber);
    return rows.map(toRecord);
  }

  async getLatestForUser(buildId: string, userId: string): Promise<ArtifactRevisionRecord | null> {
    if (!(await this.isOwnedByUser(buildId, userId))) {
      return null;
    }
    const row = await this.latestRow(buildId);
    return row ? toRecord(row) : null;
  }
}

interface InMemoryArtifactRevisionRow extends ArtifactRevisionRecord {
  ownerUserId: string;
}

/**
 * In-memory repository. Backs tests and local/e2e runs without a database.
 * Ownership is tracked via a memory-only `ownerUserId` field (not part of the
 * DB schema) so ownership gating can be exercised without Postgres.
 */
export class InMemoryArtifactRevisionsRepository implements ArtifactRevisionsRepository {
  private readonly rows: InMemoryArtifactRevisionRow[] = [];

  private copy(row: InMemoryArtifactRevisionRow): ArtifactRevisionRecord {
    return {
      id: row.id,
      buildId: row.buildId,
      revisionNumber: row.revisionNumber,
      editRequest: row.editRequest,
      artifact: row.artifact,
      createdAt: row.createdAt,
    };
  }

  private latest(buildId: string): InMemoryArtifactRevisionRow | undefined {
    return this.rows
      .filter((row) => row.buildId === buildId)
      .sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
  }

  async createForUser(
    input: CreateArtifactRevisionInput,
    userId: string,
  ): Promise<ArtifactRevisionRecord | null> {
    const build = this.owningBuild(input.buildId, userId);
    if (!build) {
      return null;
    }
    const latest = this.latest(input.buildId);
    const row: InMemoryArtifactRevisionRow = {
      id: crypto.randomUUID(),
      buildId: input.buildId,
      revisionNumber: (latest?.revisionNumber ?? 0) + 1,
      editRequest: input.editRequest,
      artifact: input.artifact,
      createdAt: new Date(),
      ownerUserId: userId,
    };
    this.rows.push(row);
    return this.copy(row);
  }

  async listForUser(buildId: string, userId: string): Promise<ArtifactRevisionRecord[]> {
    return this.rows
      .filter((row) => row.buildId === buildId && row.ownerUserId === userId)
      .sort((a, b) => a.revisionNumber - b.revisionNumber)
      .map((row) => this.copy(row));
  }

  async getLatestForUser(buildId: string, userId: string): Promise<ArtifactRevisionRecord | null> {
    const row = this.rows
      .filter((row) => row.buildId === buildId && row.ownerUserId === userId)
      .sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
    return row ? this.copy(row) : null;
  }

  // There is no owning-build check without a builds repository reference; the
  // memory-only ownerUserId on the first revision for a build establishes
  // ownership, matching InMemoryStageOutputsRepository's pattern.
  private owningBuild(buildId: string, userId: string): boolean {
    const existing = this.rows.find((row) => row.buildId === buildId);
    if (!existing) {
      return true;
    }
    return existing.ownerUserId === userId;
  }
}
