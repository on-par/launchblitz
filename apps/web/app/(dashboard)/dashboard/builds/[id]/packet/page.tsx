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
      exportHrefs={{
        markdown: `/api/builds/${id}/packet/export?format=markdown`,
        json: `/api/builds/${id}/packet/export?format=json`,
        launchKit: `/api/builds/${id}/launch-kit/export`,
        landingPage: `/api/builds/${id}/landing-page/export`,
      }}
      previewEndpoint={`/api/builds/${id}/preview`}
      editRequestsEndpoint={`/api/builds/${id}/artifact-revisions`}
    />
  );
}
