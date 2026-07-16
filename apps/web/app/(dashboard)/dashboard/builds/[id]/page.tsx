import { resolveResumeState, toStageOutputView, type StageOutputRecord } from "@launchblitz/db";
import { BuildSession, type StageOutputView } from "../../../../../components/BuildSession";
import { getSession } from "../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getStageOutputsRepository } from "../../../../../lib/stage-outputs";
import { STAGE_NAMES } from "../../../../../lib/stages";

interface BuildPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildPage({ params }: BuildPageProps) {
  const { id } = await params;
  const session = await getSession();

  let records: StageOutputRecord[] = [];
  if (session) {
    records = await getStageOutputsRepository().listForUser(id, session.userId);
  }
  const stageOutputs: StageOutputView[] = records.map(toStageOutputView);

  const build = session ? await getBuildsRepository().getForUser(id, session.userId) : null;

  const resume = build
    ? resolveResumeState(records, build.currentStage, STAGE_NAMES.length)
    : undefined;

  return (
    <BuildSession
      packetHref={`/dashboard/builds/${id}/packet`}
      stageOutputs={stageOutputs}
      build={build ? { status: build.status, currentStage: build.currentStage, seedIdea: build.seedIdea } : undefined}
      resume={resume}
    />
  );
}
