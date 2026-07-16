"use client";

import Link from "next/link";
import { useState } from "react";
import type { LovableHandoff } from "@launchblitz/workflow";

export function LovableHandoffView({
  handoff,
  packetHref,
}: {
  handoff: LovableHandoff;
  packetHref: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(handoff.markdown);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-[#CFD8DC]/45">Launch packet</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
          Lovable-ready handoff
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#CFD8DC]/66">
          This document is regenerated from the latest approved sections of your launch packet
          every time you visit this page.
        </p>
      </header>

      {!handoff.isComplete ? (
        <div className="rounded-[1.8rem] border border-[#FF4D00]/15 bg-[#FF4D00]/8 p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ff9a71]">
            Pending sections
          </p>
          <ul className="mt-3 space-y-1 text-sm leading-6 text-[#ECEFF1]/76">
            {handoff.pendingSections.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-6 text-[#CFD8DC]/66">
            Regenerate this handoff after approving them in LaunchBlitz.
          </p>
        </div>
      ) : null}

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <pre className="whitespace-pre-wrap text-sm text-[#ECEFF1]/76">{handoff.markdown}</pre>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e94700]"
        >
          {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy handoff"}
        </button>
        <Link href={packetHref} className="text-sm font-semibold text-[#ff9a71]">
          Back to launch packet
        </Link>
      </div>
    </section>
  );
}
