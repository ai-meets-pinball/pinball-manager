import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QrFehlerForm } from "@/components/qr-fehler-form";
import { getMachineByQrToken } from "@/db/queries";
import { darfMaschine } from "@/lib/rechte";
import { getClubRole, getCurrentUser } from "@/lib/session";
import { modellName } from "@/lib/format";

/*
  Öffentliche Melde-Seite hinter dem QR-Code der Maschine (kein Login nötig —
  /m steht bewusst nicht in der PROTECTED-Liste des Proxys). Wer den kurzen
  Code hat, steht vor dem Gerät und darf melden. Die URL ist absichtlich knapp
  (/m/<12 Zeichen>), damit der QR grob und gut scannbar bleibt.

  Bevorzugt ist das Konto: Angemeldete MIT Zugriff landen direkt im
  Fehler-Reiter der Maschine (volles Werkzeug); Angemeldete ohne Zugriff und
  Gäste bekommen das Minimal-Formular. Angezeigt wird nur die Identität des
  Geräts (Name, Baujahr, Foto) — keine Fehlerlisten, keine Interna.
*/
export default async function MeldenPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!/^[0-9a-f]{8,32}$/i.test(code)) notFound();

  const machine = await getMachineByQrToken(code);
  if (!machine) notFound();

  const currentUser = await getCurrentUser();
  if (currentUser) {
    const clubRolle = machine.clubId
      ? await getClubRole(currentUser.id, machine.clubId)
      : null;
    if (darfMaschine(currentUser, machine, clubRolle).lesen) {
      redirect(`/machines/${machine.id}?bereich=fehler`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        {machine.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={machine.fotoUrl}
            alt={modellName(machine)}
            className="h-16 w-16 flex-none rounded-[var(--radius)] object-cover"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-bold">Fehler melden</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {modellName(machine)}
            {machine.baujahr ? ` · ${machine.baujahr}` : ""}
          </p>
        </div>
      </div>

      <QrFehlerForm token={code} angemeldetAls={currentUser?.name ?? null} />

      {!currentUser ? (
        <p className="text-sm text-[var(--color-muted)]">
          Du hast ein Konto?{" "}
          <Link
            href={`/login?von=/m/${code}`}
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
