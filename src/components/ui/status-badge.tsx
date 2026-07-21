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
  // Priorität (Fehler: niedrig/mittel/hoch; Wartung zusätzlich sehr hoch/kritisch)
  niedrig: "var(--color-faint)",
  mittel: "var(--color-warn)",
  hoch: "var(--color-danger)",
  "sehr hoch": "var(--color-danger)",
  kritisch: "var(--color-danger)",
  // Rollen (Clubs)
  owner: "var(--color-primary)",
  admin: "var(--color-accent)",
  member: "var(--color-faint)",
  // Globale Rolle
  superadmin: "var(--color-primary)",
  supporter: "var(--color-accent)",
};

/** Anzeigenamen für Club-Rollen (Enum-Werte → deutsche Labels). */
export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Mitglied",
};

export function StatusBadge({ value }: { value: string }) {
  const c = tone[value] ?? "var(--color-faint)";
  // Rollen-Enums (owner/admin/member) auf deutsche Labels abbilden; alles andere
  // (Fehler-/Reparatur-Status) ist bereits deutsch und bleibt unverändert.
  const label = ROLE_LABEL[value] ?? value;
  return (
    <span
      className="inline-flex rounded-[4px] px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color: c,
        background: `color-mix(in srgb, ${c} 14%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
