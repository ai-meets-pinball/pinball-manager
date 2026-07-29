import { Globe, Lock, Users } from "lucide-react";
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
}: {
  eintraege: Eintrag[];
  currentUserId: string;
  machineId: string;
}) {
  if (eintraege.length === 0) return null;

  return (
    <div className="space-y-6">
      {eintraege.map((e) => {
        const eigen = e.autorId === currentUserId;
        const S = SICHT[e.visibility];
        const g = guideAus(e.inhalt);
        if (!g) return null;
        return (
          <div key={e.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--color-muted)]">
                {eigen
                  ? "Dein Guide"
                  : `Geteilt von ${e.autorName ?? "unbekannt"}`}
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <S.Icon size={13} /> {S.label}
                </span>
              </p>
              {eigen ? (
                <SetVisibility
                  knowledgeId={e.id}
                  machineId={machineId}
                  current={e.visibility}
                />
              ) : null}
            </div>
            <TroubleshootingGuideView
              daten={g.guide}
              model={g.model}
              websuche={g.websuche}
              createdAt={e.createdAt}
            />
          </div>
        );
      })}
    </div>
  );
}
