"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession } from "@/lib/auth-client";

/*
  Öffentliche Marketing-Chrome (Nav + Footer) für Start / Funktionen / Preise.
  Getrennt von der App-Nav (components/nav.tsx), die nur angemeldet erscheint.
*/

const navItems = [
  { href: "/", label: "Start" },
  { href: "/features", label: "Funktionen" },
  { href: "/preise", label: "Nutzung" },
];

export function MarketingNav() {
  const pathname = usePathname();
  // Eingeloggte Besucher der öffentlichen Seiten bekommen einen Weg zurück in die App.
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-5 py-4 backdrop-blur-md sm:px-12 sm:py-5">
      <Link href="/" className="flex items-center">
        <Logo size={22} />
      </Link>

      {/* Auf schmalen Screens umbrechen die Seiten-Links in eine eigene Zeile. */}
      <nav className="order-3 flex w-full items-center justify-center gap-1 sm:order-2 sm:w-auto">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[var(--radius)] px-[18px] py-[9px] text-sm font-medium transition-colors hover:bg-[var(--color-inset)] ${
                active ? "text-[var(--color-fg)]" : "text-[var(--color-faint)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="order-2 flex items-center gap-2.5 sm:order-3">
        <span className="mx-1 hidden h-5 w-px bg-[var(--color-border)] sm:block" />
        <ThemeToggle />
        <Link
          href={session?.user ? "/machines" : "/login"}
          className="rounded-[var(--radius)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
        >
          {session?.user ? "Zur App" : "Anmelden"}
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 border-t border-[var(--color-border)] px-5 py-8 sm:px-12">
      <div className="font-mono text-xs text-[var(--color-faint)]">
        © 2026 Pinball Manager
      </div>
      <div className="flex gap-6">
        {["Datenschutz", "Impressum", "Kontakt"].map((l) => (
          <span
            key={l}
            className="cursor-pointer text-[13px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)]"
          >
            {l}
          </span>
        ))}
      </div>
    </footer>
  );
}
