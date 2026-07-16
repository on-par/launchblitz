import { toStageOutputView } from "@launchblitz/db";
import { BuildSession, type StageOutputView } from "../../../../../components/BuildSession";
import { getSession } from "../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../lib/builds";
import { getProviderKeysRepository } from "../../../../../lib/provider-keys";
import { toProviderReadiness } from "../../../../../lib/provider-readiness";
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

  const keyRows = session ? await getProviderKeysRepository().list(session.userId) : [];
  const readiness = toProviderReadiness(keyRows);

  return (
    <BuildSession
      packetHref={`/dashboard/builds/${id}/packet`}
      stageOutputs={stageOutputs}
      build={build ? { status: build.status, currentStage: build.currentStage, seedIdea: build.seedIdea } : undefined}
      providerReadiness={readiness}
      keyVaultHref={`/settings/keys?returnTo=/dashboard/builds/${id}`}
    />
  );
}
