import { Globe, Layers, Lock, Tag, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { KnowledgeEdit } from "@/components/knowledge-edit";
import { KnowledgeGemeldet } from "@/components/knowledge-gemeldet";
import { KnowledgeHide } from "@/components/knowledge-hide";
import { KnowledgeVerlauf } from "@/components/knowledge-verlauf";
import {
  KnowledgeVerbergen,
  KnowledgeVerborgen,
} from "@/components/knowledge-moderation";
import { KnowledgeSignals } from "@/components/knowledge-signals";
import { SetVisibility } from "@/components/set-visibility";
import { deleteTipp } from "@/db/actions/tipps";

/*
  Allgemeine Tipps (typ='tipp') als MODELL-Wissen: frei formulierter Text, der
  ein oder mehrere Modelle und/oder Generationen betrifft (n:m in
  `knowledge_targets`). Anders als Fakten/Guides sind Tipps viele kleine
  Einträge — daher gestapelte Karten statt Eintrag-Reiter. Die „gilt für"-Zeile
  zeigt alle Ziele des Tipps, nicht nur das gerade betrachtete Modell.
*/
type Sicht = "privat" | "club" | "oeffentlich";

type Eintrag = {
  id: string;
  titel: string;
  inhalt: unknown;
  visibility: Sicht;
  sourceType: string;
  createdAt: Date;
  autorId: string;
  autorName: string | null;
  hilfreich: number;
  falsch: number;
  meinSignal: "hilfreich" | "falsch" | null;
  ausgeblendet: boolean;
  verborgenAm: Date | null;
  verborgenGrund: string | null;
  verborgenVonName: string | null;
  revisionen: number;
  /** Namen aller Ziel-Modelle bzw. -Generationen dieses Tipps. */
  zielModelle: string[];
  zielGenerationen: string[];
};

const SICHT: Record<Sicht, { label: string; Icon: typeof Globe }> = {
  privat: { label: "privat", Icon: Lock },
  club: { label: "Club", Icon: Users },
  oeffentlich: { label: "öffentlich", Icon: Globe },
};

function tippText(inhalt: unknown): string {
  if (!inhalt || typeof inhalt !== "object") return "";
  const t = (inhalt as Record<string, unknown>).text;
  return typeof t === "string" ? t : "";
}

export function KnowledgeTipps({
  eintraege,
  currentUserId,
  machineId,
  kannKuratieren = false,
}: {
  eintraege: Eintrag[];
  currentUserId: string;
  machineId: string;
  /** Kurator/Super-Admin: darf Einträge für alle verbergen/wiederherstellen. */
  kannKuratieren?: boolean;
}) {
  if (eintraege.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Für dieses Modell liegen dir gegenüber noch keine Tipps vor.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {eintraege.map((e) => {
        const eigen = e.autorId === currentUserId;
        if (!eigen && e.ausgeblendet && !e.verborgenAm) {
          return (
            <KnowledgeHide
              key={e.id}
              knowledgeId={e.id}
              machineId={machineId}
              ausgeblendet
              titel={e.titel}
            />
          );
        }
        const S = SICHT[e.visibility];
        return (
          <Card key={e.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--color-muted)]">
                {eigen
                  ? "Dein Tipp"
                  : `Geteilt von ${e.autorName ?? "unbekannt"}`}
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <S.Icon size={13} /> {S.label}
                </span>
              </p>
              <div className="flex items-center gap-3">
                <KnowledgeSignals
                  knowledgeId={e.id}
                  machineId={machineId}
                  hilfreich={e.hilfreich}
                  falsch={e.falsch}
                  meinSignal={e.meinSignal}
                  eigen={eigen}
                />
                {eigen ? (
                  <SetVisibility
                    knowledgeId={e.id}
                    machineId={machineId}
                    current={e.visibility}
                  />
                ) : (
                  <KnowledgeHide
                    knowledgeId={e.id}
                    machineId={machineId}
                    ausgeblendet={false}
                    titel={e.titel}
                  />
                )}
                {kannKuratieren && !e.verborgenAm ? (
                  <KnowledgeVerbergen
                    knowledgeId={e.id}
                    machineId={machineId}
                  />
                ) : null}
              </div>
            </div>
            {e.verborgenAm ? (
              <KnowledgeVerborgen
                knowledgeId={e.id}
                machineId={machineId}
                grund={e.verborgenGrund}
                vonName={e.verborgenVonName}
                am={e.verborgenAm}
                kannKuratieren={kannKuratieren}
              />
            ) : null}
            <KnowledgeGemeldet hilfreich={e.hilfreich} falsch={e.falsch} />

            <div className="space-y-1">
              <h3 className="font-semibold">{e.titel}</h3>
              <p className="whitespace-pre-wrap text-sm">
                {tippText(e.inhalt)}
              </p>
            </div>

            {/* Geltungsbereich: alle Ziele des Tipps. */}
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1">
                <Tag size={12} /> gilt für:
              </span>
              {e.zielGenerationen.map((g) => (
                <span
                  key={`g-${g}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5"
                >
                  <Layers size={11} /> {g}
                </span>
              ))}
              {e.zielModelle.map((m) => (
                <span
                  key={`m-${m}`}
                  className="rounded-full border border-[var(--color-border)] px-2 py-0.5"
                >
                  {m}
                </span>
              ))}
            </p>

            {eigen ? (
              <div className="space-y-2">
                <KnowledgeEdit
                  knowledgeId={e.id}
                  machineId={machineId}
                  typ="tipp"
                  titel={e.titel}
                  inhalt={e.inhalt}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <KnowledgeVerlauf
                    knowledgeId={e.id}
                    anzahl={e.revisionen}
                    typ="tipp"
                  />
                  <form action={deleteTipp}>
                    <input type="hidden" name="knowledgeId" value={e.id} />
                    <input type="hidden" name="machineId" value={machineId} />
                    <ConfirmButton
                      question="Tipp für alle Ziele löschen?"
                      confirmLabel="Ja, löschen"
                      className="text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      Löschen
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
