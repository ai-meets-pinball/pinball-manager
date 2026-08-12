import Link from "next/link";
import { AlertTriangle, Joystick, PowerOff, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  searchParams: Promise<{ scope?: string }>;
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

  const machines = alleMaschinen.filter((m) => aktiv.has(scopeKey(m.clubId)));
  const erlaubteIds = new Set(machines.map((m) => m.id));
  const wartungen = wartungenAlle.filter((w) => erlaubteIds.has(w.machineId));
  const fehler = fehlerAlle.filter((f) => erlaubteIds.has(f.machineId));

  // Toggle-Link: schaltet EINEN Bereich in der Auswahl an/aus. Volle bzw. leere
  // Auswahl wird als „alle" ohne Parameter geschrieben (saubere URL).
  const toggleHref = (key: string) => {
    const cur = new Set(gewaehlt.length ? gewaehlt : scopes.map((s) => s.key));
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    const arr = scopes.map((s) => s.key).filter((k) => cur.has(k));
    const voll = arr.length === 0 || arr.length === scopes.length;
    const qs = voll ? "" : `?scope=${arr.join(",")}`;
    return `/dashboard${qs}`;
  };

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
      <h1 className="text-2xl font-bold">Übersicht</h1>

      {/* Bereichs-Filter (nur bei mehreren Optionen): mehrere Bereiche lassen
          sich gleichzeitig aktivieren. Alle aktiv = kein Filter. */}
      {scopes.length > 1 ? (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Nach Bereich filtern"
        >
          <span className="text-sm text-[var(--color-muted)]">Bereich:</span>
          {scopes.map((s) => {
            const an = aktiv.has(s.key);
            return (
              <Link
                key={s.key}
                href={toggleHref(s.key)}
                aria-pressed={an}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  an
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
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
        <List empty="Alle Maschinen spielbereit.">
          {nichtSpielbereit.map((m) => (
            <ListRow
              key={m.id}
              href={`/machines/${m.id}`}
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
        <List empty="Nichts fällig — alles gewartet.">
          {wartungen.map((w) => (
            <ListRow
              key={w.id}
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
        <List empty="Keine offenen Fehler — läuft.">
          {fehler.map((f) => (
            <ListRow
              key={f.id}
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
