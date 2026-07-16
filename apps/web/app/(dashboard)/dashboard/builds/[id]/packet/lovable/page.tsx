import { assembleLaunchPacket, buildLovableHandoff } from "@launchblitz/workflow";
import { LovableHandoffView } from "../../../../../../../components/LovableHandoffView";
import { getStageOutputRecords } from "../../../../../../../lib/packet-data";

export default async function LovableHandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const records = await getStageOutputRecords(id);
  const handoff = buildLovableHandoff(assembleLaunchPacket(records));
  return <LovableHandoffView handoff={handoff} packetHref={`/dashboard/builds/${id}/packet`} />;
}
