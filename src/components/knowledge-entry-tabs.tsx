"use client";

import { useState, type ReactNode } from "react";

/*
  Pillen-Reiter für die Wissensbasis: trennt die einzelnen Wissenseinträge
  (eigene Daten, je geteilter Eintrag) als Tabs statt als gestapelte Karten —
  gleiche Optik wie die Unterreiter der Maschinen-Detailseite (machine-tabs.tsx).

  Bewusst lokaler Client-State statt URL-Parameter: die Komponente erscheint
  mehrfach pro Seite (Fakten + Guides) und auf zwei Seiten mit unterschiedlichem
  URL-Schema (?bereich=…) — eigene Query-Parameter kämen sich in die Quere.
  Die Panels kommen fertig gerendert vom Server (ReactNode-Props).
*/
export function KnowledgeEntryTabs({
  tabs,
}: {
  tabs: { id: string; label: string; panel: ReactNode }[];
}) {
  const [activeId, setActiveId] = useState<string | undefined>(tabs[0]?.id);
  if (tabs.length === 0) return null;
  // Ein einzelner Eintrag braucht keine Reiterleiste.
  if (tabs.length === 1) return <>{tabs[0].panel}</>;
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="space-y-3">
      <nav
        aria-label="Wissenseinträge"
        className="flex gap-1.5 overflow-x-auto text-sm"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            aria-current={t.id === active.id ? "true" : undefined}
            className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 transition-colors ${
              t.id === active.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {active.panel}
    </div>
  );
}
