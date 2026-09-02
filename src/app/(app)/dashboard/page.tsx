import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Joystick,
  LayoutGrid,
  List as ListIcon,
  Plus,
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
import { TurniermodusSchalter } from "@/components/turniermodus-schalter";
import { AutoRefresh } from "@/components/auto-refresh";
import { schwerster, type Betriebsstatus } from "@/lib/betriebsstatus";
import { modellName } from "@/lib/format";
import { tageDazwischen } from "@/lib/faelligkeit";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { ButtonLink } from "@/components/ui/button";
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
          <>
            {/* Bereichs-Filter (nur bei mehreren Optionen): mehrere Bereiche
                gleichzeitig; alle aktiv = kein Filter. */}
            {scopes.length > 1 ? (
              <ChipFilter ariaLabel="Nach Bereich filtern" options={bereichOptionen} />
            ) : null}
            {/* Turniermodus (Owner/Admin): ein Knopf, fragt bei mehreren Clubs nach. */}
            <TurniermodusSchalter
              clubs={managedClubs.map((c) => ({
                id: c.id,
                name: c.name,
                turniermodus: c.turniermodus,
              }))}
            />
            {/* Karten- vs. kompakte Listenansicht für die drei Abschnitte unten. */}
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
          </>
        }
      />

      {/* Erste-Schritte für neue Nutzer (0 Maschinen) — statt einer nackten Seite. */}
      {alleMaschinen.length === 0 ? (
        <section className="space-y-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              Willkommen bei Pinball Manager
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Erfasse deine Automaten, halte Fehler &amp; Reparaturen fest und
              plane die Wartung. So legst du los:
            </p>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--color-muted)]">
            <li>
              <strong>Erste Maschine anlegen</strong> — Modell aus dem Katalog
              wählen (Hersteller, Baujahr und Foto kommen automatisch).
            </li>
            <li>
              An der Maschine <strong>Fehler melden</strong> und die{" "}
              <strong>Wartung</strong> planen.
            </li>
            <li>
              Optional einem <strong>Club</strong> beitreten oder einen erstellen,
              um Maschinen &amp; Wissen zu teilen.
            </li>
          </ol>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <ButtonLink href="/machines/new">
              <Plus size={16} /> Erste Maschine anlegen
            </ButtonLink>
            <Link
              href="/help"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Zur Hilfe
            </Link>
            <Link
              href={`/feedback?von=${encodeURIComponent("/dashboard")}`}
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              Problem melden
            </Link>
          </div>
        </section>
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
              Fehler und setze ihn auf „quittiert“ — dann verstummt der Alarm.
            </p>
          </div>
        </div>
      ) : null}

      {/* Im Turniermodus live nachladen, damit neue Fehler den Alarm auslösen. */}
      {turnierAktiv ? <AutoRefresh intervalMs={25000} /> : null}

      {/* KPI-Kacheln — verlinken in Verwaltung bzw. zu den Abschnitten unten. */}
      {/* Immer EINE Zeile (auch am Handy): Zahl groß, Label klein darunter. */}
      <div className="grid grid-cols-4 gap-2">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group min-w-0">
            <Card className="flex min-w-0 items-center gap-2 p-2.5 transition-colors group-hover:border-[var(--color-primary)] sm:p-3">
              <k.icon
                size={18}
                className={`hidden shrink-0 sm:block ${k.tone || "text-[var(--color-muted)]"}`}
              />
              <div className="min-w-0">
                <p className={`text-xl font-bold leading-none sm:text-2xl ${k.tone}`}>
                  {k.wert}
                </p>
                <p className="truncate text-xs text-[var(--color-muted)] sm:text-sm">
                  {k.label}
                </p>
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
