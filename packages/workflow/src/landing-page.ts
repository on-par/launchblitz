import { strToU8, zipSync } from "fflate";
import type { LaunchPacket, PacketSection } from "./packet";
import type { PacketExportMeta } from "./packet-export";

export const LANDING_PAGE_ARTIFACT_FORMAT_VERSION = 1;

// The landing page cannot be generated without approved copy. Other approved
// sections enrich the page but are optional.
export const LANDING_PAGE_REQUIRED_SECTION_KEYS = ["copy-deck"] as const;

export function getMissingLandingPageSections(packet: LaunchPacket): string[] {
  return packet.sections
    .filter(
      (section) =>
        (LANDING_PAGE_REQUIRED_SECTION_KEYS as readonly string[]).includes(section.key) &&
        section.status !== "approved",
    )
    .map((section) => section.title);
}

export type PacketRevision = {
  fingerprint: string;
  sections: Array<{ key: string; approvedAt: string }>;
};

function fnv1aHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computePacketRevision(packet: LaunchPacket): PacketRevision {
  const approvedSections = packet.sections.filter((section) => section.status === "approved");

  const fingerprint = fnv1aHex(
    JSON.stringify(
      approvedSections.map((section) => ({
        key: section.key,
        approvedAt: section.approvedAt,
        content: section.content,
      })),
    ),
  );

  return {
    fingerprint,
    sections: approvedSections.map(({ key, approvedAt }) => ({ key, approvedAt: approvedAt as string })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function titleCase(key: string): string {
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderEntryValue(value: unknown): string {
  if (typeof value === "string") {
    return `<p>${escapeHtml(value)}</p>`;
  }
  return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function renderHero(copyDeck: PacketSection): string {
  const entries = Object.entries(copyDeck.content ?? {});
  const firstStringIndex = entries.findIndex(([, value]) => typeof value === "string");

  const heading =
    firstStringIndex === -1 ? "" : `<h1>${escapeHtml(entries[firstStringIndex][1] as string)}</h1>`;

  const paragraphs = entries
    .filter((_, index) => index !== firstStringIndex)
    .map(([, value]) => renderEntryValue(value))
    .join("\n      ");

  return `<header class="hero">\n      ${heading}\n      ${paragraphs}\n    </header>`;
}

function renderSection(section: PacketSection): string {
  const entries = Object.entries(section.content ?? {});
  const body = entries
    .map(([key, value]) => `<h3>${escapeHtml(titleCase(key))}</h3>\n      ${renderEntryValue(value)}`)
    .join("\n      ");

  return `<section>\n      <h2>${escapeHtml(section.title)}</h2>\n      ${body}\n    </section>`;
}

export function buildLandingPageHtml(packet: LaunchPacket, meta: PacketExportMeta, revision: PacketRevision): string {
  const copyDeck = packet.sections.find((section) => section.key === "copy-deck" && section.status === "approved");
  if (!copyDeck) {
    throw new Error("Landing page requires an approved Copy Deck section.");
  }

  const otherSections = packet.sections.filter(
    (section) => section.key !== "copy-deck" && section.status === "approved",
  );

  const marker = `<!-- launchblitz-landing-page v${LANDING_PAGE_ARTIFACT_FORMAT_VERSION} · packet revision ${revision.fingerprint} · generated ${meta.generatedAt} for build ${meta.buildId} -->`;

  return `<!doctype html>
${marker}
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(packet.sections.find((s) => s.key === "copy-deck")?.title ?? "Launch page")}</title>
    <style>
      :root {
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #0b0f12;
        color: #ECEFF1;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
      }
      main {
        max-width: 720px;
        margin: 0 auto;
        padding: 4rem 1.5rem;
      }
      h1 {
        color: #ffffff;
        font-size: 2.75rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        margin: 0 0 1.5rem;
      }
      h2 {
        color: #ffffff;
        font-size: 1.75rem;
        font-weight: 600;
        margin: 0 0 1rem;
      }
      h3 {
        color: #ff9a71;
        font-size: 1rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 1.5rem 0 0.5rem;
      }
      p {
        color: #CFD8DC;
        margin: 0 0 1rem;
      }
      pre {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
        padding: 1rem;
        overflow-x: auto;
        color: #CFD8DC;
      }
      .hero {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 2.5rem;
        margin-bottom: 2.5rem;
      }
      section {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 2rem;
        margin-bottom: 2rem;
      }
      section:last-child {
        border-bottom: none;
      }
      a {
        color: #FF4D00;
      }
    </style>
  </head>
  <body>
    <main>
      ${renderHero(copyDeck)}
      ${otherSections.map(renderSection).join("\n      ")}
    </main>
  </body>
</html>
`;
}

export type LandingPageArtifact = {
  formatVersion: number;
  packetRevision: PacketRevision;
  files: Array<{ path: string; contents: string }>;
};

export function buildLandingPageArtifact(packet: LaunchPacket, meta: PacketExportMeta): LandingPageArtifact {
  const missing = getMissingLandingPageSections(packet);
  if (missing.length > 0) {
    throw new Error(`Landing page requires approved sections: ${missing.join(", ")}`);
  }

  const revision = computePacketRevision(packet);
  const html = buildLandingPageHtml(packet, meta, revision);
  const metadata = {
    formatVersion: LANDING_PAGE_ARTIFACT_FORMAT_VERSION,
    buildId: meta.buildId,
    generatedAt: meta.generatedAt,
    packetRevision: revision,
  };

  return {
    formatVersion: LANDING_PAGE_ARTIFACT_FORMAT_VERSION,
    packetRevision: revision,
    files: [
      { path: "index.html", contents: html },
      { path: "metadata.json", contents: JSON.stringify(metadata, null, 2) },
    ],
  };
}

// DOS zip timestamps only encode 1980-2099 (fflate validates against the
// *local* calendar year), so epoch (1970) is out of range — this uses a
// fixed date safely inside the valid window instead.
const ZIP_MTIME = new Date(1990, 0, 1);

export function buildLandingPageZip(artifact: LandingPageArtifact): Uint8Array {
  const entries: Record<string, [Uint8Array, { level: 0; mtime: Date }]> = {};
  for (const file of artifact.files) {
    entries[file.path] = [strToU8(file.contents), { level: 0, mtime: ZIP_MTIME }];
  }

  return zipSync(entries);
}
