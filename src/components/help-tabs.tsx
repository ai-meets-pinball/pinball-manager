import Link from "next/link";

/** Umschalter zwischen Anleitung, Techstack und (nur Super-Admins) der
    Aufbau-Dokumentation. */
const tabs = [
  { href: "/help", key: "anleitung", label: "Anleitung", nurAdmin: false },
  { href: "/help/techstack", key: "techstack", label: "Techstack", nurAdmin: false },
  { href: "/help/setup", key: "setup", label: "Aufbau & Betrieb", nurAdmin: true },
] as const;

export function HelpTabs({
  active,
  istSuperAdmin = false,
}: {
  active: "anleitung" | "techstack" | "setup";
  istSuperAdmin?: boolean;
}) {
  const sichtbar = tabs.filter((t) => !t.nurAdmin || istSuperAdmin);

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
