export type StageOutputRecord = {
  stageIndex: number;
  stageName: string;
  rawOutput: Record<string, unknown> | null;
  editedOutput: Record<string, unknown> | null;
  approvedAt: Date | string | null;
};

export type PacketSectionStatus = "approved" | "draft" | "missing";

export type PacketSection = {
  key: string;
  title: string;
  stageName: string;
  status: PacketSectionStatus;
  content: Record<string, unknown> | null;
  approvedAt: string | null;
};

export type LaunchPacket = {
  sections: PacketSection[];
  missingSections: string[];
  isComplete: boolean;
};

export const LAUNCH_PACKET_SECTIONS: Array<{ key: string; title: string; stageName: string }> = [
  { key: "market-validation", title: "Market Validation", stageName: "market-validation" },
  { key: "customer-avatar", title: "Customer Avatar", stageName: "customer-avatar" },
  { key: "copy-deck", title: "Copy Deck", stageName: "copy-deck" },
  { key: "landing-page-export", title: "Landing Page Export", stageName: "lovable-export" },
  { key: "launch-kit", title: "Launch Kit", stageName: "launch-kit" },
];

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * The canonical content downstream stages and the launch packet consume:
 * the approved edited version when present, otherwise the approved raw
 * version. Unapproved records yield null — downstream never sees them.
 */
export function approvedStageContent(record: StageOutputRecord): Record<string, unknown> | null {
  if (record.approvedAt === null) return null;
  return record.editedOutput ?? record.rawOutput;
}

export function assembleLaunchPacket(
  records: StageOutputRecord[],
  options?: { includeDrafts?: boolean },
): LaunchPacket {
  const includeDrafts = options?.includeDrafts === true;
  const missingSections: string[] = [];

  const sections = LAUNCH_PACKET_SECTIONS.map((definition) => {
    const matches = records.filter((record) => record.stageName === definition.stageName);
    const approvedMatches = matches.filter((record) => record.approvedAt !== null);

    if (approvedMatches.length > 0) {
      const latest = approvedMatches.reduce((latestSoFar, candidate) =>
        toIsoString(candidate.approvedAt as Date | string) > toIsoString(latestSoFar.approvedAt as Date | string)
          ? candidate
          : latestSoFar,
      );

      const section: PacketSection = {
        key: definition.key,
        title: definition.title,
        stageName: definition.stageName,
        status: "approved",
        content: approvedStageContent(latest),
        approvedAt: toIsoString(latest.approvedAt as Date | string),
      };
      return section;
    }

    missingSections.push(definition.title);

    if (includeDrafts) {
      const draftMatches = matches.filter((record) => record.approvedAt === null);
      if (draftMatches.length > 0) {
        const draft = draftMatches[draftMatches.length - 1];
        const section: PacketSection = {
          key: definition.key,
          title: definition.title,
          stageName: definition.stageName,
          status: "draft",
          content: draft.editedOutput ?? draft.rawOutput,
          approvedAt: null,
        };
        return section;
      }
    }

    const section: PacketSection = {
      key: definition.key,
      title: definition.title,
      stageName: definition.stageName,
      status: "missing",
      content: null,
      approvedAt: null,
    };
    return section;
  });

  return {
    sections,
    missingSections,
    isComplete: missingSections.length === 0,
  };
}
