import { Globe, Lock, Users } from "lucide-react";
import { MachineDataTables } from "@/components/machine-data-tables";
import { KnowledgeSignals } from "@/components/knowledge-signals";
import { SetVisibility } from "@/components/set-visibility";

/*
  Zeigt Handbuch-Fakten als MODELL-Wissen (Datenmodell-Redesign, Phase 1). Jeder
  `knowledge`-Eintrag (typ='handbuch_fakten') gehört zum Gerätetyp und trägt Autor
  + Sichtbarkeit; eigene Einträge lassen sich in der Sichtbarkeit ändern. Der
  `inhalt` (extractSchema-Objekt) wird zur bekannten {typ, daten}[]-Form für
  `MachineDataTables` transformiert.
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
};

const SICHT: Record<Sicht, { label: string; Icon: typeof Globe }> = {
  privat: { label: "privat", Icon: Lock },
  club: { label: "Club", Icon: Users },
  oeffentlich: { label: "öffentlich", Icon: Globe },
};

function inhaltToFacts(inhalt: unknown): { typ: string; daten: unknown }[] {
  if (!inhalt || typeof inhalt !== "object") return [];
  return Object.entries(inhalt as Record<string, unknown>).map(([typ, daten]) => ({
    typ,
    daten,
  }));
}

export function KnowledgeFacts({
  eintraege,
  currentUserId,
  machineId,
}: {
  eintraege: Eintrag[];
  currentUserId: string;
  machineId: string;
}) {
  if (eintraege.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Für diesen Gerätetyp liegen dir gegenüber noch keine Handbuch-Daten vor.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {eintraege.map((e) => {
        const eigen = e.autorId === currentUserId;
        const S = SICHT[e.visibility];
        return (
          <div key={e.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--color-muted)]">
                {eigen
                  ? "Deine Handbuch-Daten"
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
                ) : null}
              </div>
            </div>
            <MachineDataTables facts={inhaltToFacts(e.inhalt)} />
          </div>
        );
      })}
    </div>
  );
}
