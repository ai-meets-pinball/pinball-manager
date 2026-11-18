import { getCurrentUser } from "@/lib/session";
import { getMachineModel } from "@/db/queries";
import { handbuchStreamAntwort } from "@/lib/handbuch-route";

/*
  Handbuch auswerten direkt am MODELL — ohne eigene Maschine (Frank 2026-11-18:
  viele Handbücher, aber nicht jedes Gerät steht im eigenen Bestand). Kern in
  lib/handbuch-route.ts.

  Schreiben darf jeder Angemeldete: der Eintrag gehört dem Autor und steht
  zunächst auf privat — dasselbe, was er schon heute über eine eigene Maschine
  dieses Modells könnte. Die KI in der App bleibt dem Betreiber vorbehalten
  (darfKi im Kern). /api ist vom Proxy ausgenommen → Anmeldung hier prüfen.
*/

// Der Claude-Pfad kann bei großen PDFs Minuten dauern (Vercel-Limit; lokal ohne Wirkung).
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const { modelId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const model = await getMachineModel(modelId).catch(() => undefined);
  if (!model) {
    return Response.json({ error: "Modell nicht gefunden." }, { status: 404 });
  }

  return handbuchStreamAntwort({
    user,
    ziel: {
      machineId: null,
      modelId: model.id,
      hersteller: model.hersteller,
      modell: model.modell,
    },
    request,
  });
}
