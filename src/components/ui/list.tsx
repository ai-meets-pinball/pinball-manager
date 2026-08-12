import { Children, type ReactNode } from "react";
import Link from "next/link";
import { cardSurface } from "@/components/ui/card";

/*
  DAS Listen-Rezept des Admin-Bereichs (und darüber hinaus). Vorher hatte jede
  Liste ihr eigenes Markup (Card vs. div, mit/ohne flex-wrap, space-y-2 vs. -3,
  mal Leerfall, mal nicht) — hier gibt es genau EIN Rezept:

  - List:   <ul> mit einheitlichem Abstand; `empty` ist PFLICHT, damit jede
            Liste ihren Leerfall benennt (einheitlich gedämpft dargestellt).
  - ListRow: <li> mit Card-Oberfläche und festen Zonen:
      leading  — z. B. Thumbnail oder Icon (flex-none)
      title    — Pflicht; mit `href` wird der Titel zum Link
      subtitle — zweite, gedämpfte Zeile (Mono-Meta vom Aufrufer via <span>)
      meta     — ruhige rechte Zone: Badges, Zähler, Links
      actions  — rechtsbündig: die Server-Action-Formulare / Controls
      children — Ausnahme-Slot in voller Breite unterhalb (Inline-Formulare)
    Immer flex-wrap (mobil brechen die Zonen sauber um), immer Truncation auf
    Titel/Untertitel.
*/
export function List({
  empty,
  kompakt = false,
  children,
}: {
  /** Text für den Leerfall — bewusst Pflicht. */
  empty: string;
  /** Kompakt: dichte Zeilen mit Haarlinien statt einzelner Karten. Die Zeilen
      müssen dann ebenfalls `kompakt` gesetzt bekommen (ListRow). */
  kompakt?: boolean;
  children?: ReactNode;
}) {
  if (Children.count(children) === 0) {
    return <p className="text-sm text-[var(--color-muted)]">{empty}</p>;
  }
  return kompakt ? (
    <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {children}
    </ul>
  ) : (
    <ul className="space-y-2">{children}</ul>
  );
}

export function ListRow({
  leading,
  title,
  href,
  subtitle,
  meta,
  actions,
  kompakt = false,
  children,
}: {
  leading?: ReactNode;
  title: ReactNode;
  href?: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Kompakt-Zeile (in einer `kompakt`-List): ohne eigene Karten-Oberfläche,
      engeres Padding — die Trennung übernimmt die Haarlinie der List. */
  kompakt?: boolean;
  children?: ReactNode;
}) {
  return (
    <li
      className={
        kompakt
          ? "flex flex-wrap items-center gap-3 px-3 py-2"
          : `${cardSurface} flex flex-wrap items-center gap-3`
      }
    >
      {leading ? <div className="flex-none">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {href ? (
            <Link href={href} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </p>
        {subtitle ? (
          <p className="truncate text-sm text-[var(--color-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {meta ? (
        <div className="flex flex-none items-center gap-2">{meta}</div>
      ) : null}
      {actions ? (
        <div className="flex flex-none flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
      {children ? <div className="w-full">{children}</div> : null}
    </li>
  );
}
