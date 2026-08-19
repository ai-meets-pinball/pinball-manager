import Link from "next/link";
import {
  AlertTriangle,
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
import {
  getDueMaintenanceForMachines,
  getOpenFaultsForMachines,
  getMeineMaschinen,
} from "@/db/queries";
import { schwerster, type Betriebsstatus } from "@/lib/betriebsstatus";
import { modellName } from "@/lib/format";
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

  const [wartungenAlle, fehlerAlle] = await Promise.all([
    getDueMaintenanceForMachines(user, ids),
    getOpenFaultsForMachines(user, ids),
  ]);

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
  const gueltig = new Set(scopes.map((s) => s.key));
  const gewaehlt = (sp.scope ?? "").split(",").filter((k) => gueltig.has(k));
  const aktiv = new Set(gewaehlt.length ? gewaehlt : scopes.map((s) => s.key));

  // Ansicht: Karten (voreingestellt) oder kompakte Liste (dichte Zeilen).
  const ansicht = sp.ansicht === "liste" ? "liste" : "karten";
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
    if (bereiche.length && bereiche.length < scopes.length) {
      p.set(
        "scope",
        scopes
          .map((s) => s.key)
          .filter((k) => bereiche.includes(k))
          .join(","),
      );
    }
    if (a === "liste") p.set("ansicht", "liste");
    const qs = p.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  };

  const machines = alleMaschinen.filter((m) => aktiv.has(scopeKey(m.clubId)));
  const erlaubteIds = new Set(machines.map((m) => m.id));
  const wartungen = wartungenAlle.filter((w) => erlaubteIds.has(w.machineId));
  const fehler = fehlerAlle.filter((f) => erlaubteIds.has(f.machineId));

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

  const ansichtStil = (an: boolean) =>
    `rounded-[var(--radius)] border p-1.5 ${
      an
        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
        : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
    }`;

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
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Übersicht</h1>
        {/* Karten- vs. kompakte Listenansicht für die drei Abschnitte unten. */}
        <div className="flex items-center gap-1" aria-label="Ansicht">
          <Link
            href={href({ ansicht: "karten" })}
            aria-label="Kartenansicht"
            title="Kartenansicht"
            className={ansichtStil(ansicht === "karten")}
          >
            <LayoutGrid size={16} />
          </Link>
          <Link
            href={href({ ansicht: "liste" })}
            aria-label="Listenansicht"
            title="Listenansicht"
            className={ansichtStil(ansicht === "liste")}
          >
            <ListIcon size={16} />
          </Link>
        </div>
      </div>

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
                </>
              }
            />
          ))}
        </List>
      </section>
    </div>
  );
}
