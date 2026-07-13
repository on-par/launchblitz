import { notFound } from "next/navigation";
import { getBuildForUser, getStageOutput } from "@launchblitz/db";
import { IDEA_STAGE_INDEX } from "@launchblitz/workflow";
import { BuildSession } from "../../../../../components/BuildSession";
import { getSession } from "../../../../../lib/auth";
import { isValidBuildId } from "../../../../../lib/build-id";
import { getDb } from "../../../../../lib/db";

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidBuildId(id)) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    notFound();
  }

  const db = getDb();
  const [build, stageOutput] = await Promise.all([
    getBuildForUser(db, id, session.userId),
    getStageOutput(db, id, IDEA_STAGE_INDEX),
  ]);
  if (!build) {
    notFound();
  }

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
