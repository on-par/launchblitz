import type { LaunchPacket, PacketSection } from "./packet";
import { renderContentBlocks } from "./lovable-handoff";

export const PACKET_EXPORT_FORMAT_VERSION = 1;

export type PacketExportMeta = {
  buildId: string;
  generatedAt: string; // ISO timestamp, injected by the caller so builders stay deterministic
};

export type PacketJsonArtifact = {
  formatVersion: number;
  buildId: string;
  generatedAt: string;
  isComplete: boolean;
  missingSections: string[];
  sections: PacketSection[];
};

export function buildPacketJsonArtifact(packet: LaunchPacket, meta: PacketExportMeta): PacketJsonArtifact {
  return {
    formatVersion: PACKET_EXPORT_FORMAT_VERSION,
    buildId: meta.buildId,
    generatedAt: meta.generatedAt,
    isComplete: packet.isComplete,
    missingSections: packet.missingSections,
    sections: packet.sections,
  };
}

function renderPacketSectionBlocks(section: PacketSection): string[] {
  if (section.status === "approved") {
    return [`## ${section.title}`, `_Approved ${section.approvedAt}_`, ...renderContentBlocks(section.content)];
  }
  return [`## ${section.title}`, "_Not yet approved — approve this stage in LaunchBlitz and re-download._"];
}

export function buildPacketMarkdown(packet: LaunchPacket, meta: PacketExportMeta): string {
  const blocks: string[] = [
    "# Launch packet",
    `<!-- launchblitz-launch-packet v${PACKET_EXPORT_FORMAT_VERSION} -->`,
    `Generated ${meta.generatedAt} for build ${meta.buildId}. Only founder-approved stage outputs carry content; re-download after approving more stages.`,
  ];

  for (const section of packet.sections) {
    blocks.push(...renderPacketSectionBlocks(section));
  }

  return blocks.join("\n\n") + "\n";
}

export type LaunchKitArtifact = {
  formatVersion: number;
  markdown: string;
  isComplete: boolean; // mirrors packet.isComplete
  pendingSections: string[]; // mirrors packet.missingSections
};

function renderReadinessChecklist(packet: LaunchPacket): string {
  return packet.sections
    .map((section) =>
      section.status === "approved"
        ? `- [x] ${section.title} — approved ${section.approvedAt}`
        : `- [ ] ${section.title} — pending`,
    )
    .join("\n");
}

export function buildLaunchKitArtifact(packet: LaunchPacket, meta: PacketExportMeta): LaunchKitArtifact {
  const launchKitSection = packet.sections.find((section) => section.key === "launch-kit");

  const blocks: string[] = [
    "# Launch Kit",
    `<!-- launchblitz-launch-kit v${PACKET_EXPORT_FORMAT_VERSION} -->`,
    `Generated ${meta.generatedAt} for build ${meta.buildId}.`,
    `## Launch readiness\n\n${renderReadinessChecklist(packet)}`,
  ];

  const contentsBlock =
    launchKitSection?.status === "approved"
      ? ["## Launch kit contents", ...renderContentBlocks(launchKitSection.content)].join("\n\n")
      : [
          "## Launch kit contents",
          "_The Launch Kit stage is not yet approved — approve it in LaunchBlitz and re-download this artifact._",
        ].join("\n\n");
  blocks.push(contentsBlock);

  return {
    formatVersion: PACKET_EXPORT_FORMAT_VERSION,
    markdown: blocks.join("\n\n") + "\n",
    isComplete: packet.isComplete,
    pendingSections: packet.missingSections,
  };
}
