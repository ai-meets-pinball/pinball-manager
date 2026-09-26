import type { ReactNode } from "react";
import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/*
  DAS Suchfeld-Rezept (vorher zwei divergente Varianten in /machines und
  /admin/modelle). Ein GET-Formular über `next/form`: ohne JS ein normales
  GET auf `action`, mit JS eine Client-Navigation — die loading.tsx der Route
  zeigt sofort den Wartezustand und der „Suchen"-Knopf spinnt (useFormStatus),
  statt dass die Seite stumm komplett neu lädt. `keep` hält weitere
  Query-Parameter (z. B. die Sortierung) über eine neue Suche hinweg; `children`
  ist der Filter-/Sortier-Slot (z. B. ein AutoSubmitSelect) IM selben Formular,
  rechts vom Suchfeld — Suche und Filter reisen gemeinsam. `resetHref` zeigt den
  „zurücksetzen"-Link nur, wenn etwas aktiv ist (`aktiv` übersteuert die
  Automatik, wenn Filter im children-Slot stecken).
*/
export function SearchToolbar({
  action,
  placeholder,
  defaultValue = "",
  label = "Suchen",
  keep = {},
  resetHref,
  aktiv,
  ohneButton = false,
  breite = "w-64",
  children,
}: {
  /** Pfad der Seite, auf der gesucht wird (Ziel des GET, z. B. "/machines"). */
  action: string;
  placeholder: string;
  defaultValue?: string;
  /** aria-label des Suchfelds. */
  label?: string;
  /** Weitere Query-Parameter, die die Suche überleben sollen. */
  keep?: Record<string, string>;
  /** Ziel des „zurücksetzen"-Links (nur gezeigt, wenn Suche/Filter aktiv). */
  resetHref?: string;
  /** Übersteuert die „ist etwas aktiv?"-Automatik (für children-Filter). */
  aktiv?: boolean;
  /** Ohne „Suchen"-Knopf: Enter submittet, Selects im Slot submitten selbst. */
  ohneButton?: boolean;
  /** Breite des Suchfelds (Tailwind-Klasse). */
  breite?: string;
  /** Filter-/Sortier-Slot im selben GET-Formular (rechts vom Suchfeld). */
  children?: ReactNode;
}) {
  const istAktiv =
    aktiv ?? (Boolean(defaultValue) || Object.keys(keep).length > 0);
  return (
    <Form action={action} className="flex flex-wrap items-center gap-2">
      {Object.entries(keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <Input
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={label}
          className={`${breite} pl-9`}
        />
      </div>
      {children}
      {ohneButton ? null : (
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
      )}
      {resetHref && istAktiv ? (
        <Link
          href={resetHref}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          zurücksetzen
        </Link>
      ) : null}
    </Form>
  );
}
