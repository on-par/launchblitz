import Link from "next/link";
import { getMissingLandingPageSections, type LaunchPacket, type PacketSection } from "@launchblitz/workflow";

function SectionCard({ section }: { section: PacketSection }) {
  if (section.status === "approved") {
    return (
      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          <span className="rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#ff9a71]">
            Approved {section.approvedAt}
          </span>
        </div>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-[#ECEFF1]/76">
          {JSON.stringify(section.content, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 opacity-60">
      <h2 className="text-lg font-semibold text-white">{section.title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#CFD8DC]/66">
        Not yet approved — this required section will appear once its stage output is approved.
      </p>
    </div>
  );
}

const DOWNLOAD_LINK_CLASSNAME =
  "rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/80 transition hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/10 hover:text-white";

const DOWNLOAD_LINK_DISABLED_CLASSNAME =
  "rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/40";

export function LaunchPacketPreview({
  packet,
  lovableHandoffHref,
  exportHrefs,
}: {
  packet: LaunchPacket;
  lovableHandoffHref?: string;
  exportHrefs?: { markdown: string; json: string; launchKit: string; landingPage: string };
}) {
  const missingLandingPageSections = getMissingLandingPageSections(packet);
  return (
    <section className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Launch packet</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
            Launch packet preview
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
            Only founder-approved outputs are compiled into the launch packet below.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {lovableHandoffHref ? (
            <Link
              href={lovableHandoffHref}
              className="rounded-full border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-4 py-2 text-sm font-semibold text-[#ff9a71] transition hover:bg-[#FF4D00]/20"
            >
              Generate Lovable handoff
            </Link>
          ) : null}
          {exportHrefs ? (
            <div className="flex flex-wrap justify-end gap-3">
              <a href={exportHrefs.markdown} className={DOWNLOAD_LINK_CLASSNAME}>
                Download Markdown
              </a>
              <a href={exportHrefs.json} className={DOWNLOAD_LINK_CLASSNAME}>
                Download JSON
              </a>
              <a href={exportHrefs.launchKit} className={DOWNLOAD_LINK_CLASSNAME}>
                Download Launch Kit
              </a>
              {missingLandingPageSections.length === 0 ? (
                <a href={exportHrefs.landingPage} className={DOWNLOAD_LINK_CLASSNAME}>
                  Download landing page (ZIP)
                </a>
              ) : (
                <span
                  className={DOWNLOAD_LINK_DISABLED_CLASSNAME}
                  title={`Approve ${missingLandingPageSections.join(", ")} to generate the landing page`}
                >
                  Download landing page (ZIP)
                </span>
              )}
            </div>
          ) : null}
        </div>
      </header>

      {!packet.isComplete ? (
        <div className="rounded-[1.8rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ff9a71]">
            Missing required sections
          </p>
          <ul className="mt-3 space-y-1 text-sm leading-6 text-[#ECEFF1]/76">
            {packet.missingSections.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm leading-6 text-[#CFD8DC]/66">All required sections approved</p>
      )}

      <div className="grid gap-4">
        {packet.sections.map((section) => (
          <SectionCard key={section.key} section={section} />
        ))}
      </div>
    </section>
  );
}
