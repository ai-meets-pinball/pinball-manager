"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  Bug,
  Globe,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

/* Hauptziele bleiben in der Kopfzeile; Clubs, Konto, Administration und
   Abmelden liegen gebündelt im Nutzer-Menü (siehe user-menu.tsx). */
const links = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/machines", label: "Maschinen", icon: Wrench },
  { href: "/modelle", label: "Wissensbasis", icon: Boxes },
  { href: "/help", label: "Hilfe", icon: BookOpen },
];

/** Kopfzeile der angemeldeten Bereiche. */
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
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-5">
          <Link href="/machines" className="flex items-center">
            <Logo size={20} />
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
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
                    size={15}
                    className={active ? "text-[var(--color-accent)]" : ""}
                  />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Runde Icon-Knöpfe — gleiche Optik wie Theme-Umschalter und Avatar. */}
          <Link
            href="/"
            title="Öffentliche Website"
            aria-label="Öffentliche Website"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-fg)] transition-colors hover:bg-[var(--color-overlay)]"
          >
            <Globe size={17} />
          </Link>
          {/* Problem melden — direkt aus der Kopfzeile, damit die AKTUELLE
              Seite als Herkunft (?von=…) in der Meldung landet. */}
          <Link
            href={`/feedback?von=${encodeURIComponent(pathname)}`}
            title="Problem melden / Feedback"
            aria-label="Problem melden / Feedback"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] transition-colors hover:bg-[var(--color-overlay)] ${
              pathname.startsWith("/feedback")
                ? "text-[var(--color-accent)] ring-2 ring-[var(--color-primary)]/40"
                : "text-[var(--color-fg)]"
            }`}
          >
            <Bug size={17} />
          </Link>
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
