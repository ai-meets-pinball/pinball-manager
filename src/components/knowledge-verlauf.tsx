"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { MachineDataTables } from "@/components/machine-data-tables";
import { TroubleshootingGuideView } from "@/components/troubleshooting-guide";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { inhaltToFacts } from "@/lib/import-facts";
import { loadKnowledgeRevisions } from "@/db/actions/knowledge";

/*
  Bearbeitungs-Verlauf eines EIGENEN Wissenseintrags (Phase 5): jede Revision
  ist der Stand VOR einer Änderung (In-Place-Edit oder Neu-Generierung). Nur
  ansehen, kein Wiederherstellen (v1) — und nur für den Autor sichtbar (das
  Server-Gate liegt in loadKnowledgeRevisions). Ein kleiner Text-Link im Kopf
  des Eintrags öffnet einen Dialog; die Stände werden erst dann geladen und mit
  den bestehenden Renderern angezeigt.
*/
type Typ = "handbuch_fakten" | "troubleshooting" | "tipp";
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
  typ: Typ;
}) {
  const [offen, setOffen] = useState(false);
  if (anzahl === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <History size={13} /> Verlauf ({anzahl})
      </button>
      {offen ? (
        <VerlaufDialog
          knowledgeId={knowledgeId}
          typ={typ}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

/* Nur gemountet, solange offen — lädt die Revisionen beim Öffnen (lazy). */
function VerlaufDialog({
  knowledgeId,
  typ,
  onClose,
}: {
  knowledgeId: string;
  typ: Typ;
  onClose: () => void;
}) {
  const [revisionen, setRevisionen] = useState<Revision[] | null>(null);
  useEffect(() => {
    let aktiv = true;
    loadKnowledgeRevisions(knowledgeId).then((r) => {
      if (aktiv) setRevisionen(r);
    });
    return () => {
      aktiv = false;
    };
  }, [knowledgeId]);

  return (
    <ActionDialog onClose={onClose} breit>
      <div className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Verlauf</h3>
        {revisionen === null ? (
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
        <div className="flex justify-end">
          <DialogAbbrechen>Schließen</DialogAbbrechen>
        </div>
      </div>
    </ActionDialog>
  );
}

function RevisionInhalt({
  typ,
  inhalt,
  editedAt,
}: {
  typ: Typ;
  inhalt: unknown;
  editedAt: Date;
}) {
  if (typ === "handbuch_fakten") {
    return <MachineDataTables facts={inhaltToFacts(inhalt)} />;
  }
  if (typ === "tipp") {
    // Tipps: der Stand ist einfach der frühere Text.
    const t =
      inhalt && typeof inhalt === "object"
        ? (inhalt as Record<string, unknown>).text
        : null;
    return typeof t === "string" ? (
      <p className="whitespace-pre-wrap text-sm">{t}</p>
    ) : null;
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
