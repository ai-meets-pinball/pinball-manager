import { AlertTriangle } from "lucide-react";

/*
  Community-Warnung (Phase 5): wurde ein Eintrag von mehreren Nutzern als
  „falsch" gemeldet (mind. 2× und mehr „falsch" als „hilfreich"), erscheint ein
  Hinweis. Rein anzeigend — nichts wird automatisch verborgen (das bliebe einer
  Kuratoren-Moderation vorbehalten).
*/
export function KnowledgeGemeldet({
  hilfreich,
  falsch,
}: {
  hilfreich: number;
  falsch: number;
}) {
  if (!(falsch >= 2 && falsch > hilfreich)) return null;
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2 text-sm text-[var(--color-warn)]">
      <AlertTriangle size={15} className="mt-0.5 flex-none" />
      <span>
        Mehrfach als fehlerhaft gemeldet ({falsch}×) — bitte mit Vorsicht
        verwenden.
      </span>
    </div>
  );
}
