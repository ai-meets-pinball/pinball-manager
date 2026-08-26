import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SammelFehlerForm } from "@/components/sammel-fehler-form";
import { getSammlungByToken } from "@/db/queries";
import { getCurrentUser } from "@/lib/session";
import { modellName } from "@/lib/format";

/*
  Melde-Formular für EIN aus der Sammlung gewähltes Gerät. Die machineId muss zur
  Sammlung des Tokens gehören (sonst notFound) — dieselbe Prüfung wiederholt die
  Action serverseitig. Oben ist bewusst klar, dass das Gerät AUS EINER LISTE
  gewählt wurde (nicht direkt am Gerät gescannt) — der Fehler wird entsprechend
  als „sammel_qr" gekennzeichnet.
*/
export default async function SammlungMeldenPage({
  params,
}: {
  params: Promise<{ code: string; machineId: string }>;
}) {
  const { code, machineId } = await params;
  if (!/^[0-9a-f]{8,32}$/i.test(code)) notFound();

  const sammlung = await getSammlungByToken(code);
  if (!sammlung) notFound();
  const maschine = sammlung.maschinen.find((m) => m.id === machineId);
  if (!maschine) notFound();

  const currentUser = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 px-6 py-10">
      <Link
        href={`/s/${code}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft size={14} /> Anderes Gerät wählen
      </Link>

      <div className="flex items-center gap-3">
        {maschine.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={maschine.fotoUrl}
            alt={modellName(maschine)}
            className="h-16 w-16 flex-none rounded-[var(--radius)] object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-bold">Fehler melden</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {modellName(maschine)}
            {maschine.baujahr ? ` · ${maschine.baujahr}` : ""}
          </p>
        </div>
      </div>

      <p className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-inset)] px-3 py-2 text-xs text-[var(--color-muted)]">
        Du meldest für{" "}
        <span className="font-medium text-[var(--color-fg)]">
          {modellName(maschine)}
        </span>{" "}
        — aus der Sammlung „{sammlung.name}" gewählt.
      </p>

      <SammelFehlerForm
        code={code}
        machineId={maschine.id}
        angemeldetAls={currentUser?.name ?? null}
      />

      {!currentUser ? (
        <p className="text-sm text-[var(--color-muted)]">
          Du hast ein Konto?{" "}
          <Link
            href={`/login?von=/s/${code}/${maschine.id}`}
            className="text-[var(--color-accent)] underline"
          >
            Anmelden
          </Link>{" "}
          — dann wird die Meldung deinem Konto zugeordnet.
        </p>
      ) : null}
    </main>
  );
}
