import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

/*
  Übersicht (Startreiter) der Maschinen-Detailseite: Foto, OPDB/IPDB und ein
  Status-Dashboard aus KPI-Karten. Jede Karte ist ein <Link>, der den passenden
  Reiter öffnet (?bereich=…) — Dashboard und Subnavigation in einem. Dieselbe
  Karten-Idee wie die Kennzahlen in <MachineDataTables>, hier auf Seitenebene.
*/
export type MachineKpi = {
  key: string;
  zahl: ReactNode;
  label: string;
  tone: "neutral" | "warn" | "danger";
};

// Die große Zahl signalisiert Dringlichkeit über die Farbe (wie die Badges).
const ZAHL_FARBE: Record<MachineKpi["tone"], string> = {
  neutral: "text-[var(--color-fg)]",
  warn: "text-[var(--color-warn)]",
  danger: "text-[var(--color-danger)]",
};

export function MachineOverview({
  machineId,
  fotoUrl,
  fotoAlt,
  opdbRef,
  ipdbRef,
  kpis,
}: {
  machineId: string;
  fotoUrl: string | null;
  fotoAlt: string;
  opdbRef: string | null;
  ipdbRef: string | null;
  kpis: MachineKpi[];
}) {
  return (
    <div className="space-y-4">
      {fotoUrl ? (
        <Card className="overflow-hidden p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoUrl}
            alt={fotoAlt}
            className="max-h-80 w-full object-cover"
          />
        </Card>
      ) : null}

      {opdbRef || ipdbRef ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {opdbRef ? (
            <Card>
              <p className="text-xs text-[var(--color-muted)]">OPDB</p>
              <p>{opdbRef}</p>
            </Card>
          ) : null}
          {ipdbRef ? (
            <Card>
              <p className="text-xs text-[var(--color-muted)]">IPDB</p>
              <a
                href={`https://www.ipdb.org/machine.cgi?id=${encodeURIComponent(ipdbRef)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--color-primary)] hover:underline"
              >
                {ipdbRef}
                <ExternalLink size={13} className="text-[var(--color-muted)]" />
              </a>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Status-Dashboard: je Bereich eine Kennzahl-Karte, öffnet den Reiter. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {kpis.map((k) => (
          <Link
            key={k.key}
            href={`/machines/${machineId}?bereich=${k.key}`}
            className="group flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-primary)]"
          >
            <span
              className={`text-2xl font-bold leading-none ${ZAHL_FARBE[k.tone]}`}
            >
              {k.zahl}
            </span>
            <span className="text-xs text-[var(--color-muted)] group-hover:text-[var(--color-fg)]">
              {k.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
