import { toStageOutputView } from "@launchblitz/db";
import { BuildSession, type StageOutputView } from "../../../../../components/BuildSession";
import { getSession } from "../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getStageOutputsRepository } from "../../../../../lib/stage-outputs";

interface BuildPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildPage({ params }: BuildPageProps) {
  const { id } = await params;
  const session = await getSession();

  let stageOutputs: StageOutputView[] = [];
  if (session) {
    const records = await getStageOutputsRepository().listForUser(id, session.userId);
    stageOutputs = records.map(toStageOutputView);
  }

  const build = session ? await getBuildsRepository().getForUser(id, session.userId) : null;

  return (
    <BuildSession
      packetHref={`/dashboard/builds/${id}/packet`}
      stageOutputs={stageOutputs}
      build={build ? { status: build.status, currentStage: build.currentStage, seedIdea: build.seedIdea } : undefined}
    />
  );
}
