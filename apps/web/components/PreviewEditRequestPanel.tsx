"use client";

import { useEffect, useState } from "react";

export interface PreviewEditRequestPanelProps {
  endpoint: string;
  onRevisionCreated: (revisionNumber: number) => void;
}

interface RevisionSummary {
  revisionNumber: number;
  editRequest: string | null;
  createdAt: string | null;
}

const BUTTON_CLASSNAME =
  "rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[#ECEFF1]/80 transition hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

export function PreviewEditRequestPanel({ endpoint, onRevisionCreated }: PreviewEditRequestPanelProps) {
  const [revisions, setRevisions] = useState<RevisionSummary[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(endpoint)
      .then(async (res) => {
        if (res.status !== 200 || cancelled) {
          return;
        }
        const body: { revisions: RevisionSummary[] } = await res.json();
        setRevisions(body.revisions);
      })
      .catch(() => {
        // No history available yet — leave the panel in its default state.
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: trimmed }),
      });
      const body = await res.json();

      if (res.status !== 201) {
        setError(body.error ?? "Could not create a revision.");
        return;
      }

      const revision: RevisionSummary = body.revision;
      setText("");
      setRevisions((prev) => [...prev, revision]);
      setMessage(`Revision ${revision.revisionNumber} created from your request — restart the preview to see it.`);
      onRevisionCreated(revision.revisionNumber);
    } catch {
      setError("Could not create a revision.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-end gap-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder='Describe a change, e.g. "Make the hero CTA more direct"'
        rows={3}
        className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-[#ECEFF1]/80 placeholder:text-[#CFD8DC]/40 focus:border-[#FF4D00]/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={text.trim().length === 0 || submitting}
        className={BUTTON_CLASSNAME}
      >
        Request a change
      </button>
      {message ? (
        <p role="status" className="text-xs text-[#CFD8DC]/50">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {revisions.length > 0 ? (
        <details className="w-full text-left">
          <summary className="cursor-pointer text-xs text-[#CFD8DC]/50">Revision history</summary>
          <ul className="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-[#CFD8DC]/70">
            {[...revisions]
              .sort((a, b) => b.revisionNumber - a.revisionNumber)
              .map((revision) => (
                <li key={revision.revisionNumber}>
                  Revision {revision.revisionNumber} · {revision.editRequest ?? "Initial generation"}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
