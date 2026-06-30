/** Farbiges Status-/Prioritäts-Label, einheitlich für Fehler & Reparaturen. */
const colors: Record<string, string> = {
  // Fehler-Status
  offen: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "in Arbeit": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  behoben:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  // Reparatur-Status
  erledigt:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  // Priorität
  niedrig: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  mittel: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  hoch: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function StatusBadge({ value }: { value: string }) {
  const cls =
    colors[value] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {value}
    </span>
  );
}
