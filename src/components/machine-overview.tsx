import type { ReactNode } from "react";
import Link from "next/link";

/*
  Übersicht (Startreiter) der Maschinen-Detailseite: ein Status-Dashboard aus
  KPI-Karten (Foto und Kennungen stehen im Seitenkopf). Jede Karte ist ein
  <Link>, der den passenden Reiter öffnet (?bereich=…) — Dashboard und
  Subnavigation in einem. Dieselbe Karten-Idee wie die Kennzahlen in
  <MachineDataTables>, hier auf Seitenebene.
*/
export type MachineKpi = {
  key: string;
  zahl: ReactNode;
  label: string;
  tone: "neutral" | "warn" | "danger" | "success";
  /** Kleine Zusatzzeile unter dem Label (z. B. „↑2 seit gestern", „vor 7 Tagen"). */
  sub?: ReactNode;
  /** Reiter, den die Karte öffnet. Fehlt er, ist die Karte kein Link. */
  href?: string;
};

// Die große Zahl signalisiert Dringlichkeit über die Farbe (wie die Badges).
const ZAHL_FARBE: Record<NonNullable<MachineKpi["tone"]>, string> = {
  neutral: "text-[var(--color-fg)]",
  warn: "text-[var(--color-warn)]",
  danger: "text-[var(--color-danger)]",
  success: "text-[var(--color-success)]",
};

const KARTE =
  "group flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2";

export function MachineOverview({
  kpis,
  faultsPreview,
}: {
  kpis: MachineKpi[];
  /** Optionale Fehler-Vorschau, unter dem KPI-Grid gerendert. */
  faultsPreview?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {/* Status-Dashboard: je Bereich eine Kennzahl-Karte, verlinkte öffnen den Reiter. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map((k) => {
          const inhalt = (
            <>
              <span
                className={`text-lg font-bold leading-none tabular-nums ${ZAHL_FARBE[k.tone]}`}
              >
                {k.zahl}
              </span>
              <span className="text-sm text-[var(--color-muted)] group-hover:text-[var(--color-fg)]">
                {k.label}
              </span>
              {k.sub ? (
                <span className="basis-full text-[11px] leading-tight text-[var(--color-faint)]">
                  {k.sub}
                </span>
              ) : null}
            </>
          );
          return k.href ? (
            <Link
              key={k.key}
              href={k.href}
              className={`${KARTE} transition-colors hover:border-[var(--color-primary)]`}
            >
              {inhalt}
            </Link>
          ) : (
            <div key={k.key} className={KARTE}>
              {inhalt}
            </div>
          );
        })}
      </div>

      {faultsPreview}
    </div>
  );
}
