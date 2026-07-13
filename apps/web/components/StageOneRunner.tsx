"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StageOneResult, type StageOneResultProps } from "./StageOneResult";

export function StageOneRunner({
  buildId,
  seedIdea,
  saved,
}: {
  buildId: string;
  seedIdea: string | null;
  saved: StageOneResultProps | null;
}) {
  const router = useRouter();
  const [idea, setIdea] = useState(seedIdea ?? "");
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StageOneResultProps | null>(saved);

  async function runStage() {
    setStatus("running");
    setError(null);
    try {
      const response = await fetch(`/api/workflow/${buildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong.");
        setStatus("error");
        return;
      }
      setResult({ status: "complete", output: json.output, provider: json.provider, model: json.model });
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <textarea
        className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white placeholder:text-[#CFD8DC]/40"
        rows={4}
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        placeholder="Describe your business idea..."
      />
      <button
        type="button"
        onClick={runStage}
        disabled={status === "running"}
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {status === "running" ? "Running…" : "Run Stage 1"}
      </button>
      {status === "error" && error ? <p className="text-sm text-red-300">{error}</p> : null}
      {result ? <StageOneResult {...result} /> : null}
    </div>
  );
}
