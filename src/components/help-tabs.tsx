import Link from "next/link";

/** Umschalter zwischen der Anleitung (How-To) und der Techstack-/Architektur-Seite. */
const tabs = [
  { href: "/help", key: "anleitung", label: "Anleitung" },
  { href: "/help/techstack", key: "techstack", label: "Techstack" },
] as const;

export function HelpTabs({ active }: { active: "anleitung" | "techstack" }) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {tabs.map((t) => (
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
