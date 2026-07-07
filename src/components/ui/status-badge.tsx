/** Farbiges Status-/Prioritäts-Label, einheitlich für Fehler & Reparaturen. */
const styles: Record<string, { bg: string; color: string }> = {
  // Fehler-Status
  offen: { bg: "rgba(255,106,61,0.15)", color: "#ff9d78" },
  "in Arbeit": { bg: "rgba(124,92,255,0.15)", color: "#a48fff" },
  behoben: { bg: "rgba(77,214,138,0.15)", color: "#4dd68a" },
  // Reparatur-Status
  erledigt: { bg: "rgba(77,214,138,0.15)", color: "#4dd68a" },
  // Priorität
  niedrig: { bg: "rgba(255,255,255,0.06)", color: "#a79fb5" },
  mittel: { bg: "rgba(255,106,61,0.15)", color: "#ff9d78" },
  hoch: { bg: "rgba(255,90,90,0.16)", color: "#ff8a8a" },
  // Rollen (Clubs)
  admin: { bg: "rgba(124,92,255,0.15)", color: "#a48fff" },
  member: { bg: "rgba(255,255,255,0.06)", color: "#a79fb5" },
};

const fallback = { bg: "rgba(255,255,255,0.06)", color: "#a79fb5" };

export function StatusBadge({ value }: { value: string }) {
  const s = styles[value] ?? fallback;
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {value}
    </span>
  );
}
