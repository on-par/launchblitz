import { assembleLaunchPacket } from "@launchblitz/workflow";
import { LaunchPacketPreview } from "../../../../../../components/LaunchPacketPreview";
import { getSession } from "../../../../../../lib/auth";
import { getStageOutputRecords } from "../../../../../../lib/packet-data";

export default async function PacketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const records = await getStageOutputRecords(id, session?.userId ?? null);
  const packet = assembleLaunchPacket(records);
  return <LaunchPacketPreview packet={packet} />;
}
