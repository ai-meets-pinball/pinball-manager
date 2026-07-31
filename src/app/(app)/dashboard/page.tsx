import Link from "next/link";
import { AlertTriangle, Joystick, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getDueMaintenanceForMachines,
  getOpenFaultsForMachines,
  getVisibleMachines,
} from "@/db/queries";
import { modellName } from "@/lib/format";
import { requireUser } from "@/lib/session";

/*
  Übersicht (Dashboard): der Einstieg über ALLE sichtbaren Maschinen hinweg —
  was steht an (fällige Wartungen), was ist kaputt (offene Fehler), plus der
  Absprung in die Verwaltung. Die Detailarbeit passiert auf der jeweiligen
  Maschinen-Seite (deep-links in den passenden Reiter).
*/
export default async function DashboardPage() {
  const user = await requireUser();
  const machines = await getVisibleMachines(user.id);
  const ids = machines.map((m) => m.id);

  const [wartungen, fehler] = await Promise.all([
    getDueMaintenanceForMachines(ids),
    getOpenFaultsForMachines(ids),
  ]);
  const ueberfaellig = wartungen.filter((w) => w.status === "ueberfaellig");

  const kpis = [
    {
      href: "/machines",
      icon: Joystick,
      wert: machines.length,
      label: "Maschinen",
      tone: "",
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
        ueberfaellig.length > 0
          ? `Wartungen (${ueberfaellig.length} überfällig)`
          : "anstehende Wartungen",
      tone: ueberfaellig.length > 0 ? "text-[var(--color-danger)]" : "",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Übersicht</h1>

      {/* KPI-Kacheln — verlinken in Verwaltung bzw. zu den Abschnitten unten. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                      w.status === "ueberfaellig"
                        ? "font-semibold text-[var(--color-danger)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {w.status === "ueberfaellig"
                      ? `überfällig${w.tageBisFaellig != null ? ` seit ${-w.tageBisFaellig} Tag(en)` : ""}`
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
        <h2 className="text-lg font-semibold">Offene Fehler ({fehler.length})</h2>
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
