const providers = [
  "OpenAI",
  "Anthropic",
  "Perplexity",
  "Exploding Topics",
  "Jasper",
  "Lovable",
  "Tidio",
];

export function KeyVault() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-black/45">Settings</p>
        <h1 className="mt-2 text-4xl font-semibold">Key vault</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <article key={provider} className="rounded-[1.5rem] border border-black/10 bg-white/75 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{provider}</h2>
                <p className="text-sm text-black/60">Connect, rotate, or revoke provider credentials.</p>
              </div>
              <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold">
                Connect
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
