import type { LaunchPacket, PacketSection } from "@launchblitz/workflow";

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

export function LaunchPacketPreview({ packet }: { packet: LaunchPacket }) {
  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Launch packet</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          Launch packet preview
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          Only founder-approved outputs are compiled into the launch packet below.
        </p>
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
