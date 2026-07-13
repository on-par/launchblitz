import { notFound } from "next/navigation";
import { getBuildForUser, getStageOutput } from "@launchblitz/db";
import { BuildSession } from "../../../../../components/BuildSession";
import { getSession } from "../../../../../lib/auth";
import { getDb } from "../../../../../lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    notFound();
  }

  const db = getDb();
  const build = await getBuildForUser(db, id, session.userId);
  if (!build) {
    notFound();
  }

  const stageOutput = await getStageOutput(db, id, 1);

  return (
    <BuildSession
      build={{ id: build.id, seedIdea: build.seedIdea, currentStage: build.currentStage }}
      stageOutput={
        stageOutput
          ? {
              output: stageOutput.rawOutput,
              provider: stageOutput.provider,
              model: stageOutput.model,
              status: stageOutput.status,
              error: stageOutput.error,
            }
          : null
      }
    />
  );
}
