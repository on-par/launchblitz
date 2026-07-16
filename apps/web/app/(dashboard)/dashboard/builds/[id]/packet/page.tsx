import { assembleLaunchPacket } from "@launchblitz/workflow";
import { LaunchPacketPreview } from "../../../../../../components/LaunchPacketPreview";
import { getStageOutputRecords } from "../../../../../../lib/packet-data";

export default async function PacketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const records = await getStageOutputRecords(id);
  const packet = assembleLaunchPacket(records);
  return (
    <LaunchPacketPreview
      packet={packet}
      lovableHandoffHref={`/dashboard/builds/${id}/packet/lovable`}
    />
  );
}
