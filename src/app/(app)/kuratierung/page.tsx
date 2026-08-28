import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { restoreKnowledge } from "@/db/actions/knowledge";
import { getKuratierungsUebersicht } from "@/db/queries";
import { kannKuratieren, requireUser } from "@/lib/session";

/*
  Kuratierungs-Übersicht (Kurator + Super-Admin). Bewusst NICHT unter /admin:
  der Layout-Guard dort ist exklusiv Super-Admin und bleibt die EINE Grenze für
  alle /admin-Seiten — die Kuratierung ist eine EIGENE Grenze für die EIGENE
  Rolle, mit eigenem, lesbarem Guard hier.

  Zwei Abschnitte: von der Community gemeldete Einträge (rein anzeigend — die
  Melde-Warnung verbirgt NIE automatisch; verbergen passiert von Hand am Eintrag
  selbst) und bereits verborgene Einträge (mit Wiederherstellen).
*/

/** Linkziel eines Wissenseintrags: Modell-Seite, Maschinen-Seite oder nichts
    (Generation-Einträge haben keine eigene Seite — sie erscheinen auf allen
    Modellen der Generation). Tipps hängen n:m an Zielen — als Linkziel dient
    ihr erstes Ziel-Modell. */
function eintragHref(e: {
  modelId: string | null;
  machineId: string | null;
  tippModelId: string | null;
}): string | undefined {
  if (e.modelId) return `/modelle/${e.modelId}`;
  if (e.machineId) return `/machines/${e.machineId}`;
  if (e.tippModelId) return `/modelle/${e.tippModelId}?bereich=tipps`;
  return undefined;
}

const TYP_LABEL: Record<string, string> = {
  handbuch_fakten: "Handbuch-Daten",
  troubleshooting: "Troubleshooting-Guide",
  tipp: "Tipp",
};

const SICHT_LABEL: Record<string, string> = {
  privat: "privat",
  club: "Club",
  oeffentlich: "öffentlich",
};

function SichtChip({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs text-[var(--color-muted)]">
      {SICHT_LABEL[value] ?? value}
    </span>
  );
}

export default async function KuratierungPage() {
  const me = await requireUser();
  if (!kannKuratieren(me)) redirect("/machines");

  const { gemeldet, verborgen } = await getKuratierungsUebersicht(me);

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldAlert size={22} className="text-[var(--color-primary)]" />
            Kuratierung
          </span>
        }
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Gemeldete Einträge ({gemeldet.length})
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Von der Community mehrfach als fehlerhaft gemeldet (mind. 2× und mehr
          &bdquo;falsch&ldquo; als &bdquo;hilfreich&ldquo;). Rein anzeigend —
          verborgen wird nichts automatisch. Zum Prüfen dem Link folgen und dort
          ggf. &bdquo;Verbergen&ldquo; nutzen.
        </p>
        <List empty="Keine gemeldeten Einträge.">
          {gemeldet.map((e) => (
            <ListRow
              key={e.id}
              title={e.titel}
              href={eintragHref(e)}
              subtitle={
                <>
                  {TYP_LABEL[e.typ] ?? e.typ} · von {e.autorName ?? "unbekannt"}
                  {e.generationName ? (
                    <> · Generation &bdquo;{e.generationName}&ldquo;</>
                  ) : null}
                </>
              }
              meta={
                <>
                  <span className="font-mono text-xs text-[var(--color-danger)]">
                    {e.falsch}× falsch · {e.hilfreich}× hilfreich
                  </span>
                  <SichtChip value={e.visibility} />
                </>
              }
            />
          ))}
        </List>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Verborgene Einträge ({verborgen.length})
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Für alle Nutzer verborgen (Autor und Kuratoren sehen sie markiert
          weiter). Wiederherstellen macht den Eintrag wieder sichtbar.
        </p>
        <List empty="Nichts verborgen.">
          {verborgen.map((e) => (
            <ListRow
              key={e.id}
              title={e.titel}
              href={eintragHref(e)}
              subtitle={
                <>
                  {TYP_LABEL[e.typ] ?? e.typ} · von {e.autorName ?? "unbekannt"}
                  {" · "}verborgen von {e.verborgenVonName ?? "unbekannt"}
                  {e.verborgenAm ? (
                    <> am {e.verborgenAm.toLocaleDateString("de-DE")}</>
                  ) : null}
                  {e.verborgenGrund ? <>: {e.verborgenGrund}</> : null}
                </>
              }
              meta={<SichtChip value={e.visibility} />}
              actions={
                <form action={restoreKnowledge}>
                  <input type="hidden" name="knowledgeId" value={e.id} />
                  <input
                    type="hidden"
                    name="machineId"
                    value={e.machineId ?? ""}
                  />
                  <ConfirmButton
                    question="Für alle wiederherstellen?"
                    confirmLabel="Ja, wiederherstellen"
                  >
                    Wiederherstellen
                  </ConfirmButton>
                </form>
              }
            />
          ))}
        </List>
      </section>
    </div>
  );
}
