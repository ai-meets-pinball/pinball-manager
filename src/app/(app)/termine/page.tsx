import { List, ListRow } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { getKommendeTermine } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { tageDazwischen } from "@/lib/faelligkeit";
import { modellName } from "@/lib/format";

/*
  Globale Agenda: alle anstehenden (offenen) Termine über die sichtbaren Geräte,
  nächster zuerst. Angelegt/erledigt werden Termine je Gerät (Reiter „Termine");
  hier ist der geräteübergreifende Überblick.
*/
export default async function TerminePage() {
  const user = await requireUser();
  const termine = await getKommendeTermine(user);
  const jetzt = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Termine (${termine.length})`}
        description="Anstehende Termine über alle deine Geräte — nächster zuerst."
      />

      <List empty="Keine anstehenden Termine. Lege sie im Reiter »Termine« eines Geräts an.">
        {termine.map((t) => {
          const tage = tageDazwischen(jetzt, t.datum);
          const wann =
            tage < 0
              ? `überfällig seit ${-tage} Tag${-tage === 1 ? "" : "en"}`
              : tage === 0
                ? "heute fällig"
                : `in ${tage} Tag${tage === 1 ? "" : "en"}`;
          const ton =
            tage <= 0
              ? "text-[var(--color-danger)]"
              : tage <= 14
                ? "text-[var(--color-fg)]"
                : "text-[var(--color-muted)]";
          return (
            <ListRow
              key={t.id}
              href={`/machines/${t.machineId}?bereich=termine`}
              title={t.titel}
              subtitle={`${modellName(t)} · ${t.datum.toLocaleDateString("de-DE")}`}
              meta={<span className={`whitespace-nowrap text-xs ${ton}`}>{wann}</span>}
            />
          );
        })}
      </List>
    </div>
  );
}
