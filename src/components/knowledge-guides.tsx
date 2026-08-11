import { Globe, Layers, Lock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KnowledgeEntryTabs } from "@/components/knowledge-entry-tabs";
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
import { TroubleshootingGuideView } from "@/components/troubleshooting-guide";

/*
  Zeigt Troubleshooting-Guides als MODELL-Wissen (Datenmodell-Redesign Phase 2).
  Jeder `knowledge`-Eintrag (typ='troubleshooting') trägt Autor + Sichtbarkeit;
  eigene Einträge lassen sich in der Sichtbarkeit ändern. Der `inhalt` ist ein
  kleiner Umschlag { guide, websuche, model } — der eigentliche Guide geht an
  die bestehende TroubleshootingGuideView.
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
  // Kuratoren-Moderation: gesetzt = für alle verborgen (solche Zeilen erreichen
  // nur noch Autor, Kuratoren und Super-Admins — der Lesepfad filtert den Rest).
  verborgenAm: Date | null;
  verborgenGrund: string | null;
  verborgenVonName: string | null;
  /** Anzahl gesicherter alter Stände (Bearbeitungs-Verlauf). */
  revisionen: number;
  // Gesetzt, wenn der Guide auf Generation-Ebene liegt (gilt für alle Modelle
  // dieser Board-/Hardware-Generation).
  generationName?: string | null;
};

const SICHT: Record<Sicht, { label: string; Icon: typeof Globe }> = {
  privat: { label: "privat", Icon: Lock },
  club: { label: "Club", Icon: Users },
  oeffentlich: { label: "öffentlich", Icon: Globe },
};

function guideAus(
  inhalt: unknown,
): { guide: unknown; websuche: boolean; model: string } | null {
  if (!inhalt || typeof inhalt !== "object") return null;
  const o = inhalt as Record<string, unknown>;
  if (!("guide" in o)) return null;
  return {
    guide: o.guide,
    websuche: Boolean(o.websuche),
    model: typeof o.model === "string" ? o.model : "",
  };
}

export function KnowledgeGuides({
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
  if (eintraege.length === 0) return null;

  // Jeder Eintrag wird ein eigener Reiter (eigener Guide zuerst, dann je ein
  // Reiter pro teilendem Autor) — statt alle Blöcke untereinander zu stapeln.
  const tabs = eintraege.flatMap((e) => {
    const eigen = e.autorId === currentUserId;
    const label = eigen ? "Dein Guide" : (e.autorName ?? "Unbekannt");
    if (!eigen && e.ausgeblendet && !e.verborgenAm) {
      return {
        id: e.id,
        label,
        panel: (
          <KnowledgeHide
            knowledgeId={e.id}
            machineId={machineId}
            ausgeblendet
            titel={e.titel}
          />
        ),
      };
    }
    const S = SICHT[e.visibility];
    const g = guideAus(e.inhalt);
    if (!g) return [];
    return {
      id: e.id,
      label,
      panel: (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--color-muted)]">
              {eigen
                ? "Dein Guide"
                : `Geteilt von ${e.autorName ?? "unbekannt"}`}
              {" · "}
              <span className="inline-flex items-center gap-1">
                <S.Icon size={13} /> {S.label}
              </span>
              {e.generationName ? (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <Layers size={13} /> Generation „{e.generationName}“
                  </span>
                </>
              ) : null}
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
                <KnowledgeVerbergen knowledgeId={e.id} machineId={machineId} />
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
          <TroubleshootingGuideView
            daten={g.guide}
            model={g.model}
            websuche={g.websuche}
            createdAt={e.createdAt}
          />
          {eigen ? (
            <>
              {/* Editiert wird NUR der guide-Teil; websuche/model bleiben serverseitig. */}
              <KnowledgeEdit
                knowledgeId={e.id}
                machineId={machineId}
                typ="troubleshooting"
                titel={e.titel}
                inhalt={g.guide}
              />
              <KnowledgeVerlauf
                knowledgeId={e.id}
                anzahl={e.revisionen}
                typ="troubleshooting"
              />
            </>
          ) : null}
        </Card>
      ),
    };
  });

  return <KnowledgeEntryTabs tabs={tabs} />;
}
