import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { builds } from "./schema";

// A build always starts at the first stage (Idea capture) in an active state.
export const INITIAL_BUILD_STATUS = "active";
export const INITIAL_BUILD_STAGE = 0;

// Build ids are Postgres uuids; a non-uuid string makes the uuid column comparison
// throw, so guard lookups and treat malformed ids as "not found".
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A persisted Build as returned to callers (all fields resolved, no nulls). */
export interface BuildRecord {
  id: string;
  userId: string;
  status: string;
  currentStage: number;
  seedIdea: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBuildInput {
  userId: string;
  seedIdea: string;
}

/**
 * Persistence boundary for Builds. Implemented by {@link DrizzleBuildsRepository}
 * for real Postgres and {@link InMemoryBuildsRepository} for tests and for local
 * runs without a database configured.
 */
export interface BuildsRepository {
  create(input: CreateBuildInput): Promise<BuildRecord>;
  /** Returns the build only when it belongs to `userId`, else null (ownership gate). */
  getByIdForUser(id: string, userId: string): Promise<BuildRecord | null>;
  listByUser(userId: string): Promise<BuildRecord[]>;
}

type BuildRow = typeof builds.$inferSelect;

function toRecord(row: BuildRow): BuildRecord {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    currentStage: row.currentStage ?? INITIAL_BUILD_STAGE,
    seedIdea: row.seedIdea ?? "",
    createdAt: row.createdAt ?? new Date(0),
    updatedAt: row.updatedAt ?? new Date(0),
  };
}

/** Drizzle/Postgres-backed repository used at runtime when DATABASE_URL is set. */
export class DrizzleBuildsRepository implements BuildsRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateBuildInput): Promise<BuildRecord> {
    const [row] = await this.db
      .insert(builds)
      .values({
        userId: input.userId,
        status: INITIAL_BUILD_STATUS,
        currentStage: INITIAL_BUILD_STAGE,
        seedIdea: input.seedIdea,
      })
      .returning();
    return toRecord(row);
  }

  async getByIdForUser(id: string, userId: string): Promise<BuildRecord | null> {
    if (!UUID_PATTERN.test(id)) {
      return null;
    }
    const [row] = await this.db
      .select()
      .from(builds)
      .where(and(eq(builds.id, id), eq(builds.userId, userId)))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async listByUser(userId: string): Promise<BuildRecord[]> {
    const rows = await this.db
      .select()
      .from(builds)
      .where(eq(builds.userId, userId))
      .orderBy(desc(builds.createdAt));
    return rows.map(toRecord);
  }
}

/**
 * In-memory repository. Backs tests and local/e2e runs without a database so the
 * full create → land flow works end to end. State lives for the process lifetime.
 */
export class InMemoryBuildsRepository implements BuildsRepository {
  private readonly store = new Map<string, BuildRecord>();

  async create(input: CreateBuildInput): Promise<BuildRecord> {
    const now = new Date();
    const record: BuildRecord = {
      id: randomUUID(),
      userId: input.userId,
      status: INITIAL_BUILD_STATUS,
      currentStage: INITIAL_BUILD_STAGE,
      seedIdea: input.seedIdea,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(record.id, record);
    return { ...record };
  }

  async getByIdForUser(id: string, userId: string): Promise<BuildRecord | null> {
    const record = this.store.get(id);
    if (!record || record.userId !== userId) {
      return null;
    }
    return { ...record };
  }

  async listByUser(userId: string): Promise<BuildRecord[]> {
    return [...this.store.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((record) => ({ ...record }));
  }
}
