/*
  Status-/Prioritäts-Chip, einheitlich für Fehler, Reparaturen & Rollen.
  Die Tönung wird per color-mix aus der jeweiligen Token-Farbe abgeleitet,
  sodass Hell- und Dunkelmodus automatisch passen.
*/
const tone: Record<string, string> = {
  // Fehler-Status
  offen: "var(--color-warn)",
  "in Arbeit": "var(--color-accent)",
  behoben: "var(--color-success)",
  // Reparatur-Status
  erledigt: "var(--color-success)",
  // Priorität
  niedrig: "var(--color-faint)",
  mittel: "var(--color-warn)",
  hoch: "var(--color-danger)",
  // Rollen (Clubs)
  admin: "var(--color-accent)",
  member: "var(--color-faint)",
};

export function StatusBadge({ value }: { value: string }) {
  const c = tone[value] ?? "var(--color-faint)";
  return (
    <span
      className="inline-flex rounded-[4px] px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: c,
        background: `color-mix(in srgb, ${c} 14%, transparent)`,
      }}
    >
      {value}
    </span>
  );
}
