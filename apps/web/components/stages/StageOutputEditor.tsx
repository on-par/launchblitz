"use client";

import { useState } from "react";

export interface StageOutputEditorProps {
  buildId: string;
  stageIndex: number;
  stageName: string;
  rawText: string;
  editedText: string | null;
}

/** Inline editor for a generated Stage output: edit and save without losing the raw generation. */
export function StageOutputEditor({
  buildId,
  stageIndex,
  stageName,
  rawText,
  editedText: initialEditedText,
}: StageOutputEditorProps) {
  const [editedText, setEditedText] = useState(initialEditedText);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(editedText ?? rawText);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveText = editedText ?? rawText;

  function startEditing() {
    setDraft(effectiveText);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setError(null);
    setIsEditing(false);
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/builds/${buildId}/stages/${stageIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedContent: draft }),
      });
      const data = (await response.json()) as {
        stageOutput?: { editedText: string | null };
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not save your edit. Try again.");
        return;
      }
      setEditedText(data.stageOutput?.editedText ?? null);
      setIsEditing(false);
    } catch {
      setError("Could not save your edit. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{stageName}</h3>
        {editedText !== null && (
          <span className="rounded-full bg-[#FF4D00]/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#FF4D00]">
            Edited
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <textarea
            className="min-h-[10rem] w-full rounded-[1rem] border border-white/10 bg-black/30 p-3 text-sm leading-6 text-[#ECEFF1]/90 focus:border-[#FF4D00]/40 focus:outline-none"
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
          {error && <p className="text-sm text-[#ff9a71]">{error}</p>}
          <div className="flex gap-3">
            <button
              className="rounded-full bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e94700] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={save}
              type="button"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-[#ECEFF1]/80 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={cancelEditing}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#ECEFF1]/76">
            {effectiveText}
          </p>
          <button
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-[#ECEFF1]/80 transition hover:bg-white/[0.06]"
            onClick={startEditing}
            type="button"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
