import type { ReactNode } from "react";

export function EditGate({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/75 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-black/65">{summary}</p>
        </div>
        <button className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
          Approve
        </button>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}
