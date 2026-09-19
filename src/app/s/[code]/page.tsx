import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { getSammlungByToken } from "@/db/queries";
import { modellName } from "@/lib/format";

/* Ab so vielen Geräten lohnt ein Suchfeld — darunter wäre es nur Rauschen. */
const SUCHE_AB = 6;

/*
  Öffentliche Sammlungs-Seite hinter dem SAMMEL-QR (kein Login — /s steht bewusst
  nicht in der PROTECTED-Liste des Proxys). Der Token führt NICHT direkt auf ein
  Gerät, sondern auf die Geräteauswahl der Sammlung (Club oder private Sammlung
  einer Person): erst ein Gerät wählen, dann dafür melden. Der Token IST die
  Zugangshürde (wie beim Geräte-QR).
*/
export default async function SammlungPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ code }, { q }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8,32}$/i.test(code)) notFound();

  const sammlung = await getSammlungByToken(code);
  if (!sammlung) notFound();

  // Suche über „Modell | Hersteller" — in-memory, die Liste ist klein und
  // bereits sortiert geladen; das GET-Formular funktioniert ohne JS.
  const suche = (q ?? "").trim().toLowerCase();
  const maschinen = suche
    ? sammlung.maschinen.filter((m) =>
        modellName(m).toLowerCase().includes(suche),
      )
    : sammlung.maschinen;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        {sammlung.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sammlung.logoUrl}
            alt={sammlung.name}
            className="h-14 w-14 flex-none rounded-[var(--radius)] object-contain"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-bold">Fehler melden</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {sammlung.name} · Gerät wählen
          </p>
        </div>
      </div>

      {sammlung.maschinen.length >= SUCHE_AB ? (
        <SearchToolbar
          placeholder="Gerät suchen …"
          label="Gerät suchen"
          defaultValue={q ?? ""}
          resetHref={`/s/${code}`}
          ohneButton
        />
      ) : null}

      {sammlung.maschinen.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Diese Sammlung hat noch keine Geräte.
        </p>
      ) : maschinen.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          Kein Gerät passt zu „{q}“.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {maschinen.map((m) => (
            <li key={m.id}>
              <Link
                href={`/s/${code}/${m.id}`}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 hover:border-[var(--color-primary)]"
              >
                {m.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.fotoUrl}
                    alt={modellName(m)}
                    className="h-12 w-12 flex-none rounded-[var(--radius)] object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 flex-none rounded-[var(--radius)] bg-[var(--color-inset)]" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{modellName(m)}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {m.baujahr ?? "—"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
