import { and, desc, eq } from "drizzle-orm";
import { builds } from "./schema";
import type { Db } from "./provider-keys/repository";
import { isUuid } from "./uuid";

export const SEED_IDEA_MAX_LENGTH = 2_000;

export type SeedIdeaValidation = { ok: true; value: string } | { ok: false; error: string };

/**
 * Validate a founder's raw idea before it seeds a new Build.
 * Trims surrounding whitespace and rejects empty or oversized submissions.
 */
export function validateSeedIdea(raw: unknown): SeedIdeaValidation {
  if (typeof raw !== "string") {
    return { ok: false, error: "Describe your idea before starting your build." };
  }

  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, error: "Describe your idea before starting your build." };
  }

  if (value.length > SEED_IDEA_MAX_LENGTH) {
    return { ok: false, error: "Keep your idea under 2,000 characters." };
  }

  return { ok: true, value };
}

export const INITIAL_BUILD_STATUS = "active";
export const INITIAL_STAGE_INDEX = 0;

/** A persisted Build as returned to callers. */
export interface BuildRecord {
  id: string;
  userId: string;
  status: string;
  currentStage: number;
  seedIdea: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateBuildInput {
  userId: string;
  seedIdea: string;
}

/**
 * Persistence boundary for Builds. Implemented by
 * {@link DrizzleBuildsRepository} for real Postgres and
 * {@link InMemoryBuildsRepository} for tests and local runs without a
 * database configured.
 */
export interface BuildsRepository {
  create(input: CreateBuildInput): Promise<BuildRecord>;
  /** Ownership-gated read: null when missing OR when the build isn't the user's. */
  getForUser(buildId: string, userId: string): Promise<BuildRecord | null>;
  /** All of the given founder's builds, most recently updated first. */
  listForUser(userId: string): Promise<BuildRecord[]>;
}

type BuildRow = typeof builds.$inferSelect;

function toRecord(row: BuildRow): BuildRecord {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    currentStage: row.currentStage ?? 0,
    seedIdea: row.seedIdea ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

/** Drizzle/Postgres-backed repository used at runtime when DATABASE_URL is set. */
export class DrizzleBuildsRepository implements BuildsRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateBuildInput): Promise<BuildRecord> {
    const [row] = await this.db
      .insert(builds)
      .values({
        userId: input.userId,
        status: INITIAL_BUILD_STATUS,
        currentStage: INITIAL_STAGE_INDEX,
        seedIdea: input.seedIdea,
      })
      .returning();
    return toRecord(row);
  }

  async getForUser(buildId: string, userId: string): Promise<BuildRecord | null> {
    if (!isUuid(buildId)) {
      return null;
    }
    const [row] = await this.db
      .select()
      .from(builds)
      .where(and(eq(builds.id, buildId), eq(builds.userId, userId)))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async listForUser(userId: string): Promise<BuildRecord[]> {
    const rows = await this.db
      .select()
      .from(builds)
      .where(eq(builds.userId, userId))
      .orderBy(desc(builds.updatedAt), desc(builds.createdAt));
    return rows.map(toRecord);
  }
}

/**
 * In-memory repository. Backs tests and local/e2e runs without a database.
 */
export class InMemoryBuildsRepository implements BuildsRepository {
  private readonly rows = new Map<string, BuildRecord>();

  private copy(row: BuildRecord): BuildRecord {
    return { ...row };
  }

  async create(input: CreateBuildInput): Promise<BuildRecord> {
    const row: BuildRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      status: INITIAL_BUILD_STATUS,
      currentStage: INITIAL_STAGE_INDEX,
      seedIdea: input.seedIdea,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(row.id, row);
    return this.copy(row);
  }

  async getForUser(buildId: string, userId: string): Promise<BuildRecord | null> {
    const row = this.rows.get(buildId);
    if (!row || row.userId !== userId) {
      return null;
    }
    return this.copy(row);
  }

  async listForUser(userId: string): Promise<BuildRecord[]> {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId)
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      .map((row) => this.copy(row));
  }
}
