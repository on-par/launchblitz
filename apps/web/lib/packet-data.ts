import type { StageOutputRecord } from "@launchblitz/workflow";

// Seam for the launch packet preview page and the packet/launch-kit export
// routes. This is where the Drizzle query over `stage_outputs` (via getDb()
// in apps/web/lib/db.ts) attaches once #16 and #18 land; until then it
// returns deterministic demo records so the assembler, preview pages, and
// downloads can all be exercised end-to-end against the same data.
export async function getStageOutputRecords(buildId: string): Promise<StageOutputRecord[]> {
  void buildId;

  return [
    {
      stageIndex: 1,
      stageName: "market-validation",
      rawOutput: { summary: "Raw market scan" },
      editedOutput: { summary: "Creator-economy tax tooling is underserved" },
      approvedAt: new Date("2026-07-10T10:00:00Z"),
    },
    {
      stageIndex: 2,
      stageName: "customer-avatar",
      rawOutput: { persona: "Solo creator earning $60k+" },
      editedOutput: null,
      approvedAt: new Date("2026-07-10T10:05:00Z"),
    },
    {
      stageIndex: 4,
      stageName: "copy-deck",
      rawOutput: { headline: "Draft headline pending review" },
      editedOutput: null,
      approvedAt: null,
    },
  ];
}
