import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Joystick,
  LayoutGrid,
  List as ListIcon,
  PowerOff,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuelleBadge } from "@/components/ui/quelle-badge";
import {
  getDueMaintenanceForMachines,
  getKommendeTermine,
  getOpenFaultsForMachines,
  getMeineMaschinen,
  getUserClubs,
} from "@/db/queries";
import { toggleTurniermodus } from "@/db/actions/clubs";
import { AutoRefresh } from "@/components/auto-refresh";
import { schwerster, type Betriebsstatus } from "@/lib/betriebsstatus";
import { modellName } from "@/lib/format";
import { tageDazwischen } from "@/lib/faelligkeit";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { cookies } from "next/headers";
import { RememberParams } from "@/components/remember-params";
import { klebrig } from "@/lib/sticky-view";
import { mindestens } from "@/lib/rechte";
import { requireUser } from "@/lib/session";

/*
  Übersicht (Dashboard): der Einstieg über ALLE sichtbaren Maschinen hinweg —
  was steht an (fällige Wartungen), was ist kaputt (offene Fehler), plus der
  Absprung in die Verwaltung. Die Detailarbeit passiert auf der jeweiligen
  Maschinen-Seite (deep-links in den passenden Reiter).
*/
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; ansicht?: string }>;
}) {
  const user = await requireUser();
  const alleMaschinen = await getMeineMaschinen(user);
  const ids = alleMaschinen.map((m) => m.id);

  const [wartungenAlle, fehlerAlle, meineClubs, termineAlle] =
    await Promise.all([
      getDueMaintenanceForMachines(user, ids),
      getOpenFaultsForMachines(user, ids),
      getUserClubs(user.id),
      getKommendeTermine(user),
    ]);

  // Turniermodus (pro Club, geteilt): Alarm, solange ein OFFENER (unquittierter)
  // Fehler an einer Maschine eines Turnier-Clubs steht — bewusst UNABHÄNGIG vom
  // Bereichsfilter, damit man den Alarm nicht wegfiltert.
  const clubVonMaschine = new Map(alleMaschinen.map((m) => [m.id, m.clubId]));
  const turnierClubIds = new Set(
    meineClubs.filter((c) => c.turniermodus).map((c) => c.id),
  );
  const alarmFehler = fehlerAlle.filter(
    (f) =>
      f.status === "offen" &&
      turnierClubIds.has(clubVonMaschine.get(f.machineId) ?? ""),
  );
  const turnierAktiv = turnierClubIds.size > 0;
  const managedClubs = meineClubs.filter((c) => mindestens(c.rolle, "admin"));

  // Bereiche (Scopes), über die der Nutzer verfügt: „Privat" (Maschinen ohne
  // Club) plus jeder Club mit sichtbaren Maschinen. Nur wenn es MEHRERE gibt,
  // lohnt der Multi-Filter (Anforderung: „falls man selbst mehrere Optionen hat").
  const scopeKey = (clubId: string | null) => clubId ?? "privat";
  let hatPrivat = false;
  const clubNamen = new Map<string, string>();
  for (const m of alleMaschinen) {
    if (m.clubId === null) hatPrivat = true;
    else if (m.club?.name) clubNamen.set(m.clubId, m.club.name);
  }
  const scopes = [
    ...(hatPrivat ? [{ key: "privat", label: "Privat" }] : []),
    ...[...clubNamen]
      .sort((a, b) => a[1].localeCompare(b[1], "de"))
      .map(([key, label]) => ({ key, label })),
  ];

  // Auswahl aus der URL (CSV) gegen die gültigen Bereiche filtern. Leere/keine
  // Auswahl = alle Bereiche (kein Filter). Zustand lebt in der URL wie überall.
  const sp = await searchParams;
  const cookieStore = await cookies();
  const gueltig = new Set(scopes.map((s) => s.key));
  // Bereich merken: URL gewinnt, sonst der gemerkte Cookie-Wert (überlebt
  // Navigation UND Sessions). "" = alle Bereiche.
  const scopeSource =
    sp.scope !== undefined
      ? sp.scope
      : (cookieStore.get("dashboardScope")?.value ?? "");
  const gewaehlt = scopeSource.split(",").filter((k) => gueltig.has(k));
  const aktiv = new Set(gewaehlt.length ? gewaehlt : scopes.map((s) => s.key));

  // Ansicht: Karten (voreingestellt) oder kompakte Liste — ebenfalls gemerkt.
  const ansicht = klebrig(
    sp.ansicht,
    cookieStore.get("dashboardView")?.value,
    (v) => v === "karten" || v === "liste",
    "karten",
  ) as "karten" | "liste";
  const kompakt = ansicht === "liste";

  // Gemeinsamer URL-Bauer: hält Bereich UND Ansicht (jede Änderung erhält das
  // jeweils andere). Volle/leere Bereichswahl und die Karten-Ansicht sind der
  // parameterfreie Normalfall.
  const href = (naechste: {
    scope?: string[];
    ansicht?: "karten" | "liste";
  }) => {
    const bereiche = naechste.scope ?? gewaehlt;
    const a = naechste.ansicht ?? ansicht;
    const p = new URLSearchParams();
    // Immer explizit (auch Defaults), damit jede Auswahl wieder wählbar ist;
    // "" = alle Bereiche.
    p.set(
      "scope",
      bereiche.length && bereiche.length < scopes.length
        ? scopes
            .map((s) => s.key)
            .filter((k) => bereiche.includes(k))
            .join(",")
        : "",
    );
    p.set("ansicht", a);
    return `/dashboard?${p.toString()}`;
  };

  const machines = alleMaschinen.filter((m) => aktiv.has(scopeKey(m.clubId)));
  const erlaubteIds = new Set(machines.map((m) => m.id));
  const wartungen = wartungenAlle.filter((w) => erlaubteIds.has(w.machineId));
  const fehler = fehlerAlle.filter((f) => erlaubteIds.has(f.machineId));
  const termine = termineAlle.filter((t) => erlaubteIds.has(t.machineId));
  const termineFaellig = termine.filter(
    (t) => tageDazwischen(new Date(), t.datum) <= 0,
  ).length;

  // Bereich-Toggle: schaltet EINEN Bereich in der Auswahl an/aus.
  const toggleHref = (key: string) => {
    const cur = new Set(gewaehlt.length ? gewaehlt : scopes.map((s) => s.key));
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    return href({ scope: scopes.map((s) => s.key).filter((k) => cur.has(k)) });
  };

  // Pillen-Optionen für den Bereichsfilter (mit Maschinenzahl je Bereich).
  const proScope = new Map<string, number>();
  for (const m of alleMaschinen) {
    const k = scopeKey(m.clubId);
    proScope.set(k, (proScope.get(k) ?? 0) + 1);
  }
  const bereichOptionen = scopes.map((s) => ({
    key: s.key,
    label: s.label,
    count: proScope.get(s.key) ?? 0,
    href: toggleHref(s.key),
    aktiv: aktiv.has(s.key),
  }));


  const faellige = wartungen.filter((w) => w.status === "faellig");
  // Betriebsstatus über die Flotte: alles außer „spielbereit" braucht Blick.
  // Wie schwer die Gesamtlage ist, entscheidet dieselbe Ordnung wie bei der
  // einzelnen Maschine (lib/betriebsstatus.ts).
  const nichtSpielbereit = machines.filter((m) => m.status !== "spielbereit");
  const ausserBetrieb =
    schwerster(nichtSpielbereit.map((m) => m.status as Betriebsstatus)) ===
    "ausser_betrieb";

  const kpis = [
    {
      href: "/machines",
      icon: Joystick,
      wert: machines.length,
      label: "Maschinen",
      tone: "",
    },
    {
      href: "#status",
      icon: PowerOff,
      wert: nichtSpielbereit.length,
      label: "nicht spielbereit",
      tone:
        nichtSpielbereit.length === 0
          ? ""
          : ausserBetrieb
            ? "text-[var(--color-danger)]"
            : "text-[var(--color-warn)]",
    },
    {
      href: "#fehler",
      icon: AlertTriangle,
      wert: fehler.length,
      label: `offene Fehler`,
      tone: fehler.length > 0 ? "text-[var(--color-warn)]" : "",
    },
    {
      href: "#wartung",
      icon: Wrench,
      wert: wartungen.length,
      label:
        faellige.length > 0
          ? `Wartungen (${faellige.length} fällig)`
          : "anstehende Wartungen",
      tone: faellige.length > 0 ? "text-[var(--color-danger)]" : "",
    },
    {
      href: "#termine",
      icon: CalendarClock,
      wert: termine.length,
      label:
        termineFaellig > 0
          ? `Termine (${termineFaellig} fällig)`
          : "anstehende Termine",
      tone: termineFaellig > 0 ? "text-[var(--color-danger)]" : "",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <RememberParams
        path="/dashboard"
        params={{ dashboardScope: gewaehlt.join(","), dashboardView: ansicht }}
      />
      <PageHeader
        title="Übersicht"
        actions={
          // Karten- vs. kompakte Listenansicht für die drei Abschnitte unten.
          <ViewToggle
            options={[
              {
                href: href({ ansicht: "karten" }),
                label: "Kartenansicht",
                icon: <LayoutGrid size={16} />,
                active: ansicht === "karten",
              },
              {
                href: href({ ansicht: "liste" }),
                label: "Listenansicht",
                icon: <ListIcon size={16} />,
                active: ansicht === "liste",
              },
            ]}
          />
        }
      />

      {/* Turniermodus-Umschalter (nur für Owner/Admin der eigenen Clubs). */}
      {managedClubs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--color-muted)]">Turniermodus:</span>
          {managedClubs.map((c) => (
            <form key={c.id} action={toggleTurniermodus}>
              <input type="hidden" name="clubId" value={c.id} />
              <button
                type="submit"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                  c.turniermodus
                    ? "border-[var(--color-danger)] font-semibold text-[var(--color-danger)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                {c.name}: {c.turniermodus ? "AN" : "aus"}
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {/* Alarm: unquittierte (offene) Fehler an Turnier-Maschinen. */}
      {alarmFehler.length > 0 ? (
        <div
          className="flex items-center gap-3 rounded-[var(--radius)] border-2 border-[var(--color-danger)] px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
          }}
        >
          <AlertTriangle
            size={22}
            className="shrink-0 text-[var(--color-danger)]"
          />
          <div>
            <p className="font-bold text-[var(--color-danger)]">
              Turniermodus — {alarmFehler.length} unbestätigte(r) Fehler
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              Neue, noch nicht quittierte Fehler an Turnier-Maschinen. Öffne den
              Fehler und setze ihn auf „quittiert" — dann verstummt der Alarm.
            </p>
          </div>
        </div>
      ) : null}

      {/* Im Turniermodus live nachladen, damit neue Fehler den Alarm auslösen. */}
      {turnierAktiv ? <AutoRefresh intervalMs={25000} /> : null}

      {/* Bereichs-Filter (nur bei mehreren Optionen): mehrere Bereiche lassen
          sich gleichzeitig aktivieren. Alle aktiv = kein Filter. */}
      {scopes.length > 1 ? (
        <ChipFilter
          label="Bereich:"
          ariaLabel="Nach Bereich filtern"
          options={bereichOptionen}
        />
      ) : null}

      {/* KPI-Kacheln — verlinken in Verwaltung bzw. zu den Abschnitten unten. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group">
            <Card className="flex items-center gap-3 transition-colors group-hover:border-[var(--color-primary)]">
              <k.icon
                size={22}
                className={k.tone || "text-[var(--color-muted)]"}
              />
              <div>
                <p className={`text-2xl font-bold leading-none ${k.tone}`}>
                  {k.wert}
                </p>
                <p className="text-sm text-[var(--color-muted)]">{k.label}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Nicht spielbereite Maschinen zuerst — die dringendste Betriebslage. */}
      <section id="status" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold">
          Nicht spielbereite Maschinen ({nichtSpielbereit.length})
        </h2>
        <List empty="Alle Maschinen spielbereit." kompakt={kompakt}>
          {nichtSpielbereit.map((m) => (
            <ListRow
              key={m.id}
              kompakt={kompakt}
              href={`/machines/${m.id}#status`}
              title={modellName(m)}
              subtitle={
                m.statusGrund ?? (m.club ? m.club.name : "Private Sammlung")
              }
              meta={<StatusBadge value={m.status} />}
            />
          ))}
        </List>
      </section>

      <section id="wartung" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold">
          Anstehende Wartungen ({wartungen.length})
        </h2>
        <List empty="Nichts fällig — alles gewartet." kompakt={kompakt}>
          {wartungen.map((w) => (
            <ListRow
              key={w.id}
              kompakt={kompakt}
              href={`/machines/${w.machineId}?bereich=wartung`}
              title={w.titel}
              subtitle={modellName(w)}
              meta={
                <>
                  <StatusBadge value={w.prioritaet} />
                  <span
                    className={`text-xs ${
                      w.status === "faellig"
                        ? "font-semibold text-[var(--color-danger)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {w.status === "faellig"
                      ? w.tageBisFaellig
                        ? `überfällig seit ${-w.tageBisFaellig} Tag(en)`
                        : "heute fällig"
                      : w.tageBisFaellig != null
                        ? `in ${w.tageBisFaellig} Tag(en)`
                        : ""}
                  </span>
                </>
              }
            />
          ))}
        </List>
      </section>

      <section id="termine" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold">
          Anstehende Termine ({termine.length})
        </h2>
        <List empty="Keine anstehenden Termine." kompakt={kompakt}>
          {termine.map((t) => {
            const tage = tageDazwischen(new Date(), t.datum);
            return (
              <ListRow
                key={t.id}
                kompakt={kompakt}
                href={`/machines/${t.machineId}?bereich=termine`}
                title={t.titel}
                subtitle={`${modellName(t)} · ${t.datum.toLocaleDateString("de-DE")}`}
                meta={
                  <span
                    className={`whitespace-nowrap text-xs ${
                      tage <= 0
                        ? "font-semibold text-[var(--color-danger)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {tage < 0
                      ? `überfällig seit ${-tage} Tag(en)`
                      : tage === 0
                        ? "heute fällig"
                        : `in ${tage} Tag(en)`}
                  </span>
                }
              />
            );
          })}
        </List>
      </section>

      <section id="fehler" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold">
          Offene Fehler ({fehler.length})
        </h2>
        <List empty="Keine offenen Fehler — läuft." kompakt={kompakt}>
          {fehler.map((f) => (
            <ListRow
              key={f.id}
              kompakt={kompakt}
              href={`/machines/${f.machineId}?bereich=fehler`}
              title={f.beschreibung}
              subtitle={`${modellName(f)} · ${f.datum.toLocaleDateString("de-DE")}`}
              meta={
                <>
                  <StatusBadge value={f.status} />
                  <StatusBadge value={f.prioritaet} />
                  <QuelleBadge quelle={f.quelle} />
                </>
              }
            />
          ))}
        </List>
      </section>
    </div>
  );
}
