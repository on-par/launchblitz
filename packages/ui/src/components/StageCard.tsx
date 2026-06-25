export function StageCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/75 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-black/65">{description}</p>
    </article>
  );
}
