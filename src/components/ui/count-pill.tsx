/*
  Kompakte Zähl-Pille für Reiter-Badges (bordered, rundlich) — bewusst getrennt
  vom Status-`Badge`: Badge = Status/Label (getönte Füllung), CountPill = Anzahl
  (umrandet). Farblogik: neutral = ruhig, warn = offene Fehler, danger =
  überfällige Wartung/Termine. Promotet aus der Maschinen-Detailseite, damit
  Detailreiter, Wissensbasis-Zähler u. a. dieselbe Pille nutzen.
*/
export function CountPill({
  n,
  tone = "neutral",
}: {
  n: number | string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const cls = {
    neutral: "border-[var(--color-border)] text-[var(--color-muted)]",
    warn: "border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 text-[var(--color-warn)]",
    danger:
      "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[tone];
  return (
    <span
      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}
    >
      {n}
    </span>
  );
}
