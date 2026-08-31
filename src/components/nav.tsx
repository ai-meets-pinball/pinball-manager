"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bug, Globe } from "lucide-react";
import { Logo } from "@/components/logo";
import { NAV_LINKS } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { IconButtonLink } from "@/components/ui/icon-button";
import { ICON } from "@/components/ui/icon";

/* Kopfzeile der angemeldeten Bereiche. Die Hauptziele stehen ab `sm` hier;
   darunter übernimmt die Bottom-Tab-Bar (bottom-nav.tsx), damit das obere Band
   nicht überläuft. Clubs, Konto, Administration und Abmelden liegen gebündelt
   im Nutzer-Menü (user-menu.tsx). */
export function Nav({
  userName,
  avatar,
  kuerzel,
  isSuperAdmin = false,
  istKurator = false,
}: {
  userName: string;
  avatar: string | null;
  kuerzel: string;
  isSuperAdmin?: boolean;
  /** Kurator ODER Super-Admin: zeigt den Menüpunkt „Kuratierung". */
  istKurator?: boolean;
}) {
  const pathname = usePathname();

  return (
    // print:hidden — beim Drucken (z. B. QR-Etikett) zählt nur der Inhalt.
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md print:hidden">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-5">
          <Link href="/machines" className="flex shrink-0 items-center">
            <Logo size={20} />
          </Link>

          {/* Hauptziele nur ab sm — mobil übernimmt die Bottom-Tab-Bar. */}
          <div className="hidden items-center gap-0.5 sm:flex sm:gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                    active
                      ? "bg-[var(--color-inset)] text-[var(--color-fg)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-inset)] hover:text-[var(--color-fg)]"
                  }`}
                >
                  <Icon
                    size={ICON.md}
                    className={active ? "text-[var(--color-accent)]" : ""}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Preview-Kennzeichnung als Status-Pille bei den App-Steuerungen.
              Ab sm sichtbar — die schmale Mobile-Kopfzeile bleibt unüberfüllt. */}
          <span className="hidden shrink-0 rounded-full border border-[var(--color-border)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)] sm:inline-block">
            Preview
          </span>
          {/* Runde Icon-Knöpfe — gemeinsame IconButton-Chrome. */}
          <IconButtonLink
            href="/"
            title="Öffentliche Website"
            aria-label="Öffentliche Website"
          >
            <Globe size={ICON.md} />
          </IconButtonLink>
          {/* Problem melden — direkt aus der Kopfzeile, damit die AKTUELLE
              Seite als Herkunft (?von=…) in der Meldung landet. */}
          <IconButtonLink
            href={`/feedback?von=${encodeURIComponent(pathname)}`}
            title="Problem melden / Feedback"
            aria-label="Problem melden / Feedback"
            active={pathname.startsWith("/feedback")}
          >
            <Bug size={ICON.md} />
          </IconButtonLink>
          <ThemeToggle />
          <UserMenu
            userName={userName}
            avatar={avatar}
            kuerzel={kuerzel}
            isSuperAdmin={isSuperAdmin}
            istKurator={istKurator}
          />
        </div>
      </nav>
    </header>
  );
}
