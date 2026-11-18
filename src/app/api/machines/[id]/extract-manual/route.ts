import { requireMachineAccess } from "@/lib/session";
import { handbuchStreamAntwort } from "@/lib/handbuch-route";

/*
  Handbuch auswerten an einer Maschine — Kern in lib/handbuch-route.ts.

  /api ist vom Proxy-Matcher ausgenommen → hier keine automatische Auth-Weiterleitung;
  die Autorisierung passiert explizit über requireMachineAccess.
*/

// Der Claude-Pfad kann bei großen PDFs Minuten dauern (Vercel-Limit; lokal ohne Wirkung).
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: machineId } = await params;

  // Autorisierung: Eigentümer, echtes Club-Mitglied oder Super-Admin (kein RLS).
  const zugriff = await requireMachineAccess(machineId).catch(() => null);
  if (!zugriff) {
    return Response.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }
  if (!zugriff.darf.bearbeiten) {
    return Response.json({ error: "Kein Schreibzugriff auf diese Maschine." }, { status: 403 });
  }
  const { user, machine } = zugriff;

  return handbuchStreamAntwort({
    user,
    ziel: {
      machineId: machine.id,
      modelId: machine.modelId,
      hersteller: machine.hersteller,
      modell: machine.modell,
    },
    request,
  });
}
