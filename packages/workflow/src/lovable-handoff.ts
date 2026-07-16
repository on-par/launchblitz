import type { LaunchPacket, PacketSection } from "./packet";

export const LOVABLE_HANDOFF_FORMAT_VERSION = 1;

export type LovableHandoff = {
  formatVersion: number;
  markdown: string;
  includedSections: string[]; // titles of approved sections rendered into the markdown
  pendingSections: string[]; // titles not yet approved (mirrors packet.missingSections)
  isComplete: boolean; // mirrors packet.isComplete
};

export function renderContentBlocks(content: Record<string, unknown> | null): string[] {
  if (content === null) {
    return ["_No content captured for this section._"];
  }

  const blocks: string[] = [];
  for (const [key, value] of Object.entries(content)) {
    blocks.push(`**${key}**`);
    blocks.push(typeof value === "string" ? value : "```json\n" + JSON.stringify(value, null, 2) + "\n```");
  }
  return blocks;
}

function renderSectionBlocks(section: PacketSection): string[] {
  return [`## ${section.title}`, `_Approved ${section.approvedAt}_`, ...renderContentBlocks(section.content)];
}

export function buildLovableHandoff(packet: LaunchPacket): LovableHandoff {
  const includedSections = packet.sections.filter((section) => section.status === "approved");

  const blocks: string[] = [
    "# Lovable Build Handoff",
    `<!-- launchblitz-lovable-handoff v${LOVABLE_HANDOFF_FORMAT_VERSION} -->`,
    "Paste this entire document into Lovable's build prompt. It was generated from the approved sections of your LaunchBlitz launch packet; regenerate it after approving more stages to pick up the latest content.",
  ];

  for (const section of includedSections) {
    blocks.push(...renderSectionBlocks(section));
  }

  if (packet.missingSections.length > 0) {
    blocks.push("## Pending sections");
    blocks.push(
      `Not yet approved and not included: ${packet.missingSections.join(", ")}. Regenerate this handoff after approving them in LaunchBlitz.`,
    );
  }

  return {
    formatVersion: LOVABLE_HANDOFF_FORMAT_VERSION,
    markdown: blocks.join("\n\n") + "\n",
    includedSections: includedSections.map((section) => section.title),
    pendingSections: packet.missingSections,
    isComplete: packet.isComplete,
  };
}
