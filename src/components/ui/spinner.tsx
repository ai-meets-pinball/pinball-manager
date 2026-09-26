import { Loader2 } from "lucide-react";

/*
  DER Spinner — ein Rezept für jedes „es läuft gerade" (Feedback 09/2026:
  „nach jedem Klick sofort ein Spinner"). Vorher lag `Loader2` in 22 Dateien in
  vier Größen und zwei Farben. Farbe erbt vom Kontext (currentColor).

  Ohne `label`: rein dekorativ (aria-hidden) — der umgebende Knopf trägt
  `aria-busy`. Mit `label`: eigenständige Statusanzeige mit Text, z. B. in den
  loading.tsx-Dateien („Lädt …").
*/
export function Spinner({
  size = 16,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  const icon = <Loader2 size={size} className="animate-spin" aria-hidden />;
  if (!label) return <span className={`inline-flex ${className}`}>{icon}</span>;
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 text-sm ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
