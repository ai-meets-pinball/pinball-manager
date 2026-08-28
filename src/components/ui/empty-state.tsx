import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/*
  Leerzustand mit einheitlichem Ton: optionales Icon + ein Satz + optionale
  Aktion. Für Bereiche, die ohne Inhalt sonst „leer und tot" wirken (Reiter,
  Dashboard-Abschnitte). Listen nutzen weiter `List`s Pflicht-`empty`-Text; für
  einen reicheren, zentrierten Leerfall diese Komponente.
*/
export function EmptyState({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
      {Icon ? <Icon size={24} className="text-[var(--color-faint)]" /> : null}
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{children}</p>
      {action}
    </div>
  );
}
