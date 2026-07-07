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
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/[0.88] px-6 py-[18px] backdrop-blur-md sm:px-12">
      <Link href="/" className="flex items-center">
        <span className="font-display text-[18px] tracking-[0.5px]">
          pinball<span className="text-[var(--color-primary)]">-manager</span>
        </span>
      </Link>

      <nav className="flex items-center gap-1.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-[18px] py-[9px] text-sm font-semibold transition-colors hover:bg-[var(--color-overlay)] ${
                active ? "text-[var(--color-primary-soft)]" : "text-[var(--color-fg)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <span className="mx-2 h-[22px] w-px bg-[var(--color-border)]" />
        <ThemeToggle />
        <Link
          href="/register"
          className="rounded-full bg-[var(--color-primary)] px-[22px] py-2.5 text-sm font-bold text-[var(--color-primary-fg)] shadow-[0_4px_20px_rgba(255,106,61,0.35)] transition-colors hover:bg-[var(--color-primary-soft)]"
        >
          Loslegen
        </Link>
      </nav>
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
