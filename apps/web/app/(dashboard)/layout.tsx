import type { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Builds" },
  { href: "/settings/keys", label: "Key vault" },
  { href: "/settings/billing", label: "Billing" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-black/10 bg-[var(--foreground)] p-6 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">LaunchBlitz</p>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="block rounded-2xl px-4 py-3 text-white/80 transition hover:bg-white/10 hover:text-white"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
