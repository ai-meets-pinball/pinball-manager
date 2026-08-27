"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/components/nav-links";

/*
  Mobile Bottom-Tab-Bar (nur < sm): die Hauptziele in Daumenreichweite, statt
  sie oben ins gedrängte Topbar-Icon-Band zu quetschen. Best-of-class für
  Field-Nutzung „Reparatur an der Maschine" (iOS HIG / Material). Auf ≥ sm
  übernimmt wieder die Topbar (siehe nav.tsx). Jeder Eintrag ist ≥ 56px hoch
  (komfortables Tap-Ziel); die Leiste respektiert die Home-Indicator-Safe-Area.
*/
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "text-[var(--color-fg)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              <Icon
                size={20}
                className={active ? "text-[var(--color-accent)]" : ""}
              />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
