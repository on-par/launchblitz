export function InlineEditor({ label, value }: { label: string; value: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-black/45">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
        defaultValue={value}
      />
    </label>
  );
}
