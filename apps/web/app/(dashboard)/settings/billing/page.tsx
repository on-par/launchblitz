const tiers = [
  { name: "Free", price: "$0", details: "1 build, no export" },
  { name: "Builder", price: "$29", details: "10 builds and Lovable export" },
  { name: "Pro", price: "$79", details: "Unlimited builds, team seats, customization" },
];

export default function BillingPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-black/45">Billing</p>
        <h1 className="mt-2 text-4xl font-semibold">Plans and portal</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <article key={tier.name} className="rounded-[1.5rem] border border-black/10 bg-white/75 p-6">
            <h2 className="text-2xl font-semibold">{tier.name}</h2>
            <p className="mt-2 text-3xl">{tier.price}</p>
            <p className="mt-3 text-black/65">{tier.details}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
