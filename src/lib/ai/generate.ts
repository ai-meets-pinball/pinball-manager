import { anthropicAdapter } from "@/lib/ai/anthropic";
import { mlxAdapter } from "@/lib/ai/mlx";
import { ollamaAdapter } from "@/lib/ai/ollama";
import type { AiProvider } from "@/lib/ai/provider";
import { AiError, type AiAdapter, type AiAnfrage, type AiAntwort } from "@/lib/ai/types";

export {
  AiError,
  type AiAdapter,
  type AiAnfrage,
  type AiAntwort,
  type AiDokument,
  type AiFehlerArt,
  type AiRohantwort,
} from "@/lib/ai/types";

/*
  Der Anbieter-Seam: EIN Weg, ein Modell nach JSON zu fragen.

  Vorher entschied jedes der drei KI-Features selbst, welchen Anbieter es
  anspricht — drei `if (provider === …)`-Leitern, vier Stellen mit
  `new Anthropic(`, vier wortgleiche `extractJson`-Kopien und drei
  Fehlerübersetzungen. Jeder Aufrufer musste wissen, dass Claude einen Key
  braucht und ein `Message`-Objekt liefert, während die lokalen Wege einen
  nackten String zurückgeben.

  Hier weiß das nur noch der Adapter. Aufrufer sagen, WAS sie wollen
  (System, Prompt, Schema, optional ein Dokument), und bekommen geparstes
  JSON oder einen AiError mit fertiger deutscher Meldung.

  Nicht hier drin, mit Absicht:
  - Streaming/Fortschritt — das ist ein UI-Protokoll, kein Anbieter-Merkmal.
    manual-extract.ts ruft je Paket einmal auf und meldet selbst Fortschritt.
  - Die „auto"-Eskalation (Haiku → Sonnet bei leerem Ergebnis) — „das Ergebnis
    ist leer" ist Extraktionswissen, keine Anbieter-Eigenschaft.
  - Das Vorbereiten von PDFs — siehe prepare-document.ts.
*/

function adapterFuer(provider: AiProvider): AiAdapter {
  if (provider === "ollama") return ollamaAdapter;
  if (provider === "mlx") return mlxAdapter;
  return (anfrage) => anthropicAdapter(provider, anfrage);
}

/** JSON aus dem Antworttext lösen, falls das Modell es umrahmt hat. */
export function sliceJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/**
 * Ein Modell nach JSON fragen. Wirft AiError mit fertiger Meldung; gibt bei
 * abgeschnittener Antwort `abgeschnitten: true` zurück, statt zu werfen.
 *
 * `adapter` ist nur für Tests da: damit lassen sich die Zustände (abgelehnt,
 * abgeschnitten, unparsbar) prüfen, ohne ein Modell zu befragen.
 */
export async function generateJson(
  provider: AiProvider,
  anfrage: AiAnfrage,
  adapter: AiAdapter = adapterFuer(provider),
): Promise<AiAntwort> {
  const roh = await adapter(anfrage);

  if (roh.ende === "abgelehnt") {
    throw new AiError("abgelehnt", "Die Verarbeitung wurde abgelehnt.");
  }
  if (roh.ende === "pausiert") {
    throw new AiError(
      "sonstiges",
      "Die Websuche dauerte zu lange. Bitte erneut versuchen.",
    );
  }

  // Abgeschnitten heißt: der Text ist unvollständig und damit fast sicher
  // kein gültiges JSON. Nicht parsen, sondern melden — der Aufrufer entscheidet.
  if (roh.ende === "abgeschnitten") {
    return {
      json: null,
      model: roh.model,
      websucheGenutzt: roh.websucheGenutzt ?? false,
      abgeschnitten: true,
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(sliceJson(roh.text));
  } catch (e) {
    throw new AiError(
      "ungueltige-antwort",
      "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen.",
      e,
    );
  }

  return {
    json,
    model: roh.model,
    websucheGenutzt: roh.websucheGenutzt ?? false,
    abgeschnitten: false,
  };
}
