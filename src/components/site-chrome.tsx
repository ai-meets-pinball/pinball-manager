"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

/*
  Öffentliche Marketing-Chrome (Nav + Footer) für Home / Features / Preise.
  Getrennt von der App-Nav (components/nav.tsx), die nur angemeldet erscheint.
*/

const navItems = [
  { href: "/", label: "Start" },
  { href: "/features", label: "Funktionen" },
  { href: "/preise", label: "Preise" },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/[0.88] px-5 py-3 backdrop-blur-md sm:px-12 sm:py-[18px]">
      <Link href="/" className="flex items-center">
        <span className="font-display text-[18px] tracking-[0.5px]">
          pinball<span className="text-[var(--color-primary)]">-manager</span>
        </span>
      </Link>

      {/* Auf schmalen Screens umbrechen die Seiten-Links in eine eigene Zeile. */}
      <nav className="order-3 flex w-full items-center justify-center gap-1 sm:order-2 sm:w-auto sm:gap-1.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-[9px] text-sm font-semibold transition-colors hover:bg-[var(--color-overlay)] sm:px-[18px] ${
                active ? "text-[var(--color-primary-soft)]" : "text-[var(--color-fg)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="order-2 flex items-center gap-2 sm:order-3">
        <span className="mx-1 hidden h-[22px] w-px bg-[var(--color-border)] sm:block" />
        <ThemeToggle />
        <Link
          href="/register"
          className="rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-[var(--color-primary-fg)] shadow-[0_4px_20px_rgba(255,106,61,0.35)] transition-colors hover:bg-[var(--color-primary-soft)] sm:px-[22px]"
        >
          Loslegen
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mx-auto flex max-w-[1320px] items-center justify-between border-t border-[var(--color-border)] px-6 py-10 sm:px-12">
      <div className="font-mono text-xs text-[var(--color-faint)]">
        © 2026 Pinball Manager. Zwischen zwei Spielen gebaut.
      </div>
      <div className="flex gap-6">
        {["Datenschutz", "Impressum", "Kontakt"].map((l) => (
          <span
            key={l}
            className="cursor-pointer text-[13px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-primary-soft)]"
          >
            {l}
          </span>
        ))}
      </div>
    </footer>
  );
}
