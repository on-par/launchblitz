import { BuildSession } from "../../../../../components/BuildSession";

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuildSession packetHref={`/dashboard/builds/${id}/packet`} />;
}
