import { notFound } from "next/navigation";
import { BuildSession } from "../../../../../components/BuildSession";
import { getCurrentUserId } from "../../../../../lib/auth";
import { getBuildsRepository } from "../../../../../lib/builds";

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getCurrentUserId();
  if (!userId) {
    notFound();
  }

  const build = await getBuildsRepository().getByIdForUser(id, userId);
  if (!build) {
    notFound();
  }

  return (
    <BuildSession
      build={{
        id: build.id,
        status: build.status,
        currentStage: build.currentStage,
        seedIdea: build.seedIdea,
      }}
    />
  );
}
