import Link from "next/link";

/** Umschalter zwischen Anleitung, Techstack, der Admin-Hilfe (Kuratoren +
    Super-Admins) und (nur Super-Admins) der Aufbau-Dokumentation. */
const tabs = [
  { href: "/help", key: "anleitung", label: "Anleitung", nurAdmin: false, nurKurator: false },
  { href: "/help/techstack", key: "techstack", label: "Techstack", nurAdmin: false, nurKurator: false },
  { href: "/help/admin", key: "admin", label: "Administration", nurAdmin: false, nurKurator: true },
  { href: "/help/setup", key: "setup", label: "Aufbau & Betrieb", nurAdmin: true, nurKurator: false },
] as const;

export function HelpTabs({
  active,
  istSuperAdmin = false,
  darfKuratieren = false,
}: {
  active: "anleitung" | "techstack" | "admin" | "setup";
  istSuperAdmin?: boolean;
  /** Kurator ODER Super-Admin — zeigt den Tab „Administration". */
  darfKuratieren?: boolean;
}) {
  const sichtbar = tabs.filter(
    (t) => (!t.nurAdmin || istSuperAdmin) && (!t.nurKurator || darfKuratieren),
  );

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {sichtbar.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            active === t.key
              ? "border-[var(--color-primary)] text-[var(--color-fg)]"
              : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
