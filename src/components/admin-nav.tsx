"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, Mail, Users } from "lucide-react";

/*
  Unter-Navigation des Admin-Bereichs (gerendert vom admin/layout.tsx). Trennt die
  vormals eine lange Seite in geordnete Bereiche. Aktiv-Zustand aus dem Pfad.
*/
const TABS = [
  { href: "/admin", label: "Nutzer & Rollen", icon: Users, exact: true },
  { href: "/admin/clubs", label: "Clubs", icon: Building2, exact: false },
  { href: "/admin/vorlagen", label: "E-Mail-Vorlagen", icon: Mail, exact: false },
  { href: "/admin/modelle", label: "Gerätetypen", icon: Boxes, exact: false },
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Administrationsbereiche"
      className="flex flex-wrap gap-1 border-b border-[var(--color-border)]"
    >
      {TABS.map((t) => {
        const aktiv = t.exact ? path === t.href : path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              aktiv
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            <Icon size={15} /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
