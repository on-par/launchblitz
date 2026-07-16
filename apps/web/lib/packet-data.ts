import type { StageOutputRecord as DbStageOutputRecord } from "@launchblitz/db";
import type { StageOutputRecord as PacketStageOutputRecord } from "@launchblitz/workflow";
import type { StageOutputsRepository } from "@launchblitz/db";
import { getStageOutputsRepository } from "./stage-outputs";

/** Map a persisted stage_outputs row to the packet assembler's input shape. */
export function toPacketRecord(record: DbStageOutputRecord): PacketStageOutputRecord {
  return {
    stageIndex: record.stageIndex,
    stageName: record.stageName,
    rawOutput: record.rawOutput,
    editedOutput: record.editedOutput,
    approvedAt: record.approvedAt,
  };
}

/**
 * Ownership-gated read for the launch packet preview. Signed-out (null
 * userId) or not-owned builds yield [], which the assembler renders as
 * every required section missing.
 */
export async function getStageOutputRecords(
  buildId: string,
  userId: string | null,
  repository: StageOutputsRepository = getStageOutputsRepository(),
): Promise<PacketStageOutputRecord[]> {
  if (!userId) {
    return [];
  }
  const records = await repository.listForUser(buildId, userId);
  return records.map(toPacketRecord);
}
