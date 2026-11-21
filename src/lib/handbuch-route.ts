import { resolveProvider } from "@/lib/ai/provider";
import {
  extractManualFactsStream,
  type ExtractProgress,
} from "@/lib/manual-extract";
import { getKiInDerApp } from "@/db/queries/settings";
import { darfEigenenSchluessel, darfKi } from "@/lib/ki-zugang";
import { holeHandbuch, loescheHandbuch } from "@/lib/handbuch-speicher";
import { pruefeHandbuchPfad } from "@/lib/handbuch-tmp";
import type { HandbuchZiel } from "@/lib/handbuch-ziel";
import type { SessionUser } from "@/lib/session";

/*
  Streamende Handbuch-Extraktion (Phase 2) — der gemeinsame Kern der beiden
  API-Routen: an der Maschine (api/machines/[id]/extract-manual) und direkt am
  Modell (api/modelle/[modelId]/extract-manual). Die Route klärt, WER schreiben
  darf und WOHIN (Ziel); hier folgen die KI-Regel, das Formular und der Stream.

  Als API-Route statt Server Action, weil große gescannte Handbücher batchweise
  verarbeitet werden und der Client den Fortschritt LIVE sehen soll — ein Server
  Action liefert nur ein Endergebnis. Antwort: NDJSON (eine JSON-Zeile je
  Fortschritts-Event, siehe ExtractProgress). Nur die extrahierten Fakten
  landen in der DB (Copyright-Pipeline, PRD §6):
  - bis 4 MB kommt das PDF im Formular (`manual`) und bleibt nur im Speicher;
  - größere hat der Browser vorher in den PRIVATEN Store geladen
    (lib/handbuch-tmp.ts), das Formular trägt nur den Pfad (`blobPfad`). Das
    PDF wird dort gelesen und im `finally` gelöscht — auch wenn die Auswertung
    scheitert. Was trotzdem liegen bleibt, räumt der nächtliche Job ab.
*/
export async function handbuchStreamAntwort(opts: {
  user: SessionUser;
  ziel: HandbuchZiel;
  request: Request;
}): Promise<Response> {
  const { user, ziel, request } = opts;

  // Die Regel (lib/ki-zugang) schützt, nicht der gesperrte Knopf: Handbuch
  // auswerten in der App ist dem Betreiber vorbehalten.
  const kiInDerApp = await getKiInDerApp(user.id);
  const ki = darfKi(user, "handbuch", kiInDerApp);
  if (!ki.erlaubt) {
    return Response.json({ error: ki.grund }, { status: 403 });
  }

  const formData = await request.formData();
  const roherPfad = formData.get("blobPfad");
  const blobPfad = typeof roherPfad === "string" ? roherPfad : null;
  if (blobPfad !== null && !pruefeHandbuchPfad(user.id, blobPfad)) {
    return Response.json({ error: "Ungültiger Upload-Pfad." }, { status: 400 });
  }
  const attest = formData.get("attest") === "on";
  const provider = resolveProvider(formData);
  const apiKey = darfEigenenSchluessel(user, kiInDerApp)
    ? String(formData.get("apiKey") ?? "").trim() || undefined
    : undefined;
  const highDetail = formData.get("highDetail") === "on";
  const rohSicht = String(formData.get("visibility") ?? "");
  const visibility: "privat" | "club" | "oeffentlich" =
    rohSicht === "club" || rohSicht === "oeffentlich" ? rohSicht : "privat";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: ExtractProgress) =>
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      try {
        const file = blobPfad ? await holeHandbuch(blobPfad) : formData.get("manual");
        for await (const ev of extractManualFactsStream({
          userId: user.id,
          ziel,
          visibility,
          file: file as File,
          attest,
          provider,
          apiKey,
          highDetail,
        })) {
          send(ev);
        }
      } catch (e) {
        // Unerwarteter Fehler: als letztes Event melden, damit der Client es zeigt.
        console.error("[extract-manual route]", (e as Error).message);
        send({ type: "error", error: "Verarbeitung fehlgeschlagen. Bitte erneut versuchen." });
      } finally {
        if (blobPfad) {
          await loescheHandbuch(blobPfad).catch((e: Error) =>
            console.error("[extract-manual] Zwischen-PDF nicht gelöscht, der Aufräum-Job holt es:", e.message),
          );
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
