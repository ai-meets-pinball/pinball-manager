"use client";

import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { MachineDataTables } from "@/components/machine-data-tables";
import { TroubleshootingGuideView } from "@/components/troubleshooting-guide";
import { inhaltToFacts } from "@/lib/import-facts";
import { loadKnowledgeRevisions } from "@/db/actions/knowledge";

/*
  Bearbeitungs-Verlauf eines EIGENEN Wissenseintrags (Phase 5): jede Revision
  ist der Stand VOR einer Änderung (In-Place-Edit oder Neu-Generierung). Nur
  ansehen, kein Wiederherstellen (v1) — und nur für den Autor sichtbar (das
  Server-Gate liegt in loadKnowledgeRevisions). Die Stände werden erst beim
  Aufklappen geladen und mit den bestehenden Renderern angezeigt.
*/
type Revision = {
  id: string;
  titel: string;
  inhalt: unknown;
  editedAt: Date;
  kommentar: string | null;
  editorName: string | null;
};

export function KnowledgeVerlauf({
  knowledgeId,
  anzahl,
  typ,
}: {
  knowledgeId: string;
  anzahl: number;
  typ: "handbuch_fakten" | "troubleshooting";
}) {
  const [revisionen, setRevisionen] = useState<Revision[] | null>(null);
  const [laedt, setLaedt] = useState(false);

  if (anzahl === 0) return null;

  async function laden() {
    if (revisionen || laedt) return;
    setLaedt(true);
    try {
      setRevisionen(await loadKnowledgeRevisions(knowledgeId));
    } finally {
      setLaedt(false);
    }
  }

  return (
    <details
      className="rounded-[var(--radius)] border border-[var(--color-border)]"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) void laden();
      }}
    >
      <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        <History size={14} /> Verlauf ({anzahl})
      </summary>
      <div className="space-y-4 border-t border-[var(--color-border)] p-3">
        {laedt ? (
          <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Loader2 size={14} className="animate-spin" /> Lade Verlauf…
          </p>
        ) : null}
        {revisionen?.map((r) => (
          <div key={r.id} className="space-y-2">
            <p className="text-sm text-[var(--color-muted)]">
              Stand vor der Änderung vom{" "}
              {new Date(r.editedAt).toLocaleString("de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              durch {r.editorName ?? "unbekannt"}
              {r.kommentar ? <> — „{r.kommentar}“</> : null}
            </p>
            <p className="text-sm font-medium">{r.titel}</p>
            <RevisionInhalt typ={typ} inhalt={r.inhalt} editedAt={r.editedAt} />
          </div>
        ))}
      </div>
    </details>
  );
}

function RevisionInhalt({
  typ,
  inhalt,
  editedAt,
}: {
  typ: "handbuch_fakten" | "troubleshooting";
  inhalt: unknown;
  editedAt: Date;
}) {
  if (typ === "handbuch_fakten") {
    return <MachineDataTables facts={inhaltToFacts(inhalt)} />;
  }
  // Guides: die Revision speichert den Umschlag-Snapshot { guide, websuche, model }.
  const o =
    inhalt && typeof inhalt === "object"
      ? (inhalt as Record<string, unknown>)
      : {};
  if (!("guide" in o)) return null;
  return (
    <TroubleshootingGuideView
      daten={o.guide}
      model={typeof o.model === "string" ? o.model : ""}
      websuche={Boolean(o.websuche)}
      createdAt={editedAt}
    />
  );
}
