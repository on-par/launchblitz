import { and, eq } from "drizzle-orm";
import type { Database } from "./client";
import { builds, stageOutputs } from "./schema";

export async function createBuild(
  db: Database,
  input: { userId: string; seedIdea?: string },
) {
  const [row] = await db
    .insert(builds)
    .values({ userId: input.userId, status: "created", currentStage: 0, seedIdea: input.seedIdea })
    .returning();
  return row;
}

export async function getBuildForUser(db: Database, buildId: string, userId: string) {
  const [row] = await db
    .select()
    .from(builds)
    .where(and(eq(builds.id, buildId), eq(builds.userId, userId)));
  return row;
}

export async function updateBuild(
  db: Database,
  buildId: string,
  patch: { status?: string; currentStage?: number; seedIdea?: string },
) {
  const [row] = await db
    .update(builds)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(builds.id, buildId))
    .returning();
  return row;
}

export async function upsertStageOutput(
  db: Database,
  input: {
    buildId: string;
    stageIndex: number;
    stageName: string;
    rawOutput: unknown;
    provider: string;
    model: string;
    status: string;
    error?: string;
  },
) {
  const [row] = await db
    .insert(stageOutputs)
    .values({
      buildId: input.buildId,
      stageIndex: input.stageIndex,
      stageName: input.stageName,
      rawOutput: input.rawOutput,
      provider: input.provider,
      model: input.model,
      status: input.status,
      error: input.error,
    })
    .onConflictDoUpdate({
      target: [stageOutputs.buildId, stageOutputs.stageIndex],
      set: {
        stageName: input.stageName,
        rawOutput: input.rawOutput,
        provider: input.provider,
        model: input.model,
        status: input.status,
        error: input.error ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function getStageOutput(db: Database, buildId: string, stageIndex: number) {
  const [row] = await db
    .select()
    .from(stageOutputs)
    .where(and(eq(stageOutputs.buildId, buildId), eq(stageOutputs.stageIndex, stageIndex)));
  return row;
}
