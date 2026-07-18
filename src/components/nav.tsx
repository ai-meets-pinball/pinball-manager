"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Globe, Wrench } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

/* Hauptziele bleiben in der Kopfzeile; Clubs, Konto, Administration und
   Abmelden liegen gebündelt im Nutzer-Menü (siehe user-menu.tsx). */
const links = [
  { href: "/machines", label: "Maschinen", icon: Wrench },
  { href: "/help", label: "Hilfe", icon: BookOpen },
];

/** Kopfzeile der angemeldeten Bereiche. */
export function Nav({
  userName,
  isSuperAdmin = false,
}: {
  userName: string;
  isSuperAdmin?: boolean;
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
          <Link
            href="/"
            title="Öffentliche Website"
            className="flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-inset)] hover:text-[var(--color-fg)]"
          >
            <Globe size={15} />
            <span className="hidden sm:inline">Website</span>
          </Link>
          <ThemeToggle />
          <UserMenu userName={userName} isSuperAdmin={isSuperAdmin} />
        </div>
      </nav>
    </header>
  );
}
