import { requireMachineWrite } from "@/lib/session";
import { resolveProvider } from "@/lib/ai/provider";
import {
  extractManualFactsStream,
  type ExtractProgress,
} from "@/lib/manual-extract";

/*
  Streamende Handbuch-Extraktion (Phase 2). Als API-Route statt Server Action,
  weil große gescannte Handbücher batchweise verarbeitet werden und der Client den
  Fortschritt LIVE sehen soll — ein Server Action liefert nur ein Endergebnis.
  Antwort: NDJSON (eine JSON-Zeile je Fortschritts-Event, siehe ExtractProgress).

  /api ist vom Proxy-Matcher ausgenommen → hier keine automatische Auth-Weiterleitung;
  die Autorisierung passiert explizit über requireMachineWrite. Das PDF bleibt nur
  im Speicher (Copyright-Pipeline), nur die extrahierten Fakten landen in der DB.
*/

// Der Claude-Pfad kann bei großen PDFs Minuten dauern (Vercel-Limit; lokal ohne Wirkung).
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: machineId } = await params;

  // Autorisierung: Eigentümer, echtes Club-Mitglied oder Super-Admin (kein RLS).
  try {
    await requireMachineWrite(machineId);
  } catch {
    return Response.json({ error: "Kein Schreibzugriff auf diese Maschine." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("manual");
  const attest = formData.get("attest") === "on";
  const provider = resolveProvider(formData);
  const apiKey = String(formData.get("apiKey") ?? "").trim() || undefined;
  const highDetail = formData.get("highDetail") === "on";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: ExtractProgress) =>
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      try {
        for await (const ev of extractManualFactsStream({
          machineId,
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
