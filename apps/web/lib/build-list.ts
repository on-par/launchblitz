import type { BuildRecord } from "@launchblitz/db";
import { stageLabel } from "./stages";

export interface BuildListItem {
  id: string;
  title: string;
  status: string;
  stageLabel: string;
  updatedLabel: string;
  resumeHref: string;
}

// Fixed locale + UTC so server renders (and tests) are deterministic
// regardless of host timezone.
const updatedFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit", timeZone: "UTC",
});

/** Founder-facing "last updated" label; em dash when the timestamp is missing. */
export function formatUpdatedAt(date: Date | null): string {
  return date ? updatedFormatter.format(date) : "—";
}

/** Shape a persisted Build for the /builds list row. */
export function toBuildListItem(record: BuildRecord): BuildListItem {
  return {
    id: record.id,
    title: record.seedIdea?.trim() || "Untitled build",
    status: record.status,
    stageLabel: stageLabel(record.currentStage),
    updatedLabel: formatUpdatedAt(record.updatedAt ?? record.createdAt),
    resumeHref: `/dashboard/builds/${record.id}`,
  };
}
