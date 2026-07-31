import Link from "next/link";

/*
  DAS Blätter-Rezept für lange Listen. Baut die hrefs selbst aus basePath +
  params + `seite` (Konvention der deutschen Query-Parameter: q, seite, ohne …);
  `seite=1` wird weggelassen (kanonische URL). Rendert nichts bei nur einer
  Seite. Leere <span/>s halten die justify-between-Symmetrie an den Enden.
*/
export function Pagination({
  page,
  pages,
  basePath,
  params = {},
}: {
  page: number;
  pages: number;
  basePath: string;
  /** Query-Werte, die beim Blättern erhalten bleiben (z. B. { q, ohne: "1" }). */
  params?: Record<string, string>;
}) {
  if (pages <= 1) return null;

  const href = (seite: number) => {
    const p = new URLSearchParams(params);
    if (seite > 1) p.set("seite", String(seite));
    const qs = p.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const linkStil =
    "rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-border)]/40";

  return (
    <nav
      aria-label="Seiten"
      className="flex items-center justify-between gap-3 pt-1 text-sm"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkStil}>
          ← Zurück
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[var(--color-muted)]">
        Seite {page} von {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkStil}>
          Weiter →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
