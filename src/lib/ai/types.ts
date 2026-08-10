/*
  Der Vertrag des Anbieter-Seams — bewusst ohne eigene Importe, damit die
  Adapter (anthropic, ollama, mlx) und generate.ts ihn teilen können, ohne
  einen Zyklus zu bilden.
*/

/** Was ein Modell außer dem Prompt noch zu sehen bekommt (nur im Speicher). */
export type AiDokument =
  | { art: "pdf"; base64: string }
  | { art: "bilder"; bilder: string[] };

export type AiAnfrage = {
  system?: string;
  prompt: string;
  /** JSON-Schema — erzwingt bei Claude/Ollama die Form, bei MLX als Anweisung. */
  schema: Record<string, unknown>;
  dokument?: AiDokument;
  /** Websuche erlauben. Nur Claude kann das; lokale Wege ignorieren es. */
  websuche?: boolean;
  maxTokens?: number;
  /** Ephemerer BYO-Schlüssel (Claude). Fällt auf ANTHROPIC_API_KEY zurück. */
  apiKey?: string;
  /** Modell erzwingen; sonst entscheidet der Adapter anhand des Anbieters. */
  model?: string;
  /** Nur für die Fehlermeldung, z. B. „Extraktion fehlgeschlagen: …". */
  zweck?: string;
};

export type AiAntwort = {
  /** Geparstes JSON — der Aufrufer prüft die Form mit seinem eigenen zod-Schema. */
  json: unknown;
  model: string;
  websucheGenutzt: boolean;
  /**
   * Die Antwort ist unvollständig (Token-Limit). Bewusst ein Wert und kein
   * Fehler: die Extraktion überspringt so ein Paket und behält den Rest, der
   * Guide bricht ab. Diese Entscheidung gehört dem Aufrufer.
   */
  abgeschnitten: boolean;
};

export type AiFehlerArt =
  | "kein-key"
  | "abgelehnt"
  | "nicht-erreichbar"
  | "ungueltige-antwort"
  | "sonstiges";

/** Fehler mit fertiger, für Nutzer gedachter deutscher Meldung. */
export class AiError extends Error {
  readonly art: AiFehlerArt;
  readonly userMessage: string;

  constructor(art: AiFehlerArt, userMessage: string, ursache?: unknown) {
    super(userMessage);
    this.name = "AiError";
    this.art = art;
    this.userMessage = userMessage;
    if (ursache instanceof Error) this.cause = ursache;
  }
}

/*
  Was ein Adapter liefert: roher Text plus die wenigen Zustände, die alle
  Anbieter gemeinsam haben. Die anbieterspezifischen stop_reason-Werte
  übersetzt der Adapter hierher — danach ist die Logik für alle gleich.
*/
export type AiRohantwort = {
  text: string;
  model: string;
  ende: "fertig" | "abgeschnitten" | "abgelehnt" | "pausiert";
  websucheGenutzt?: boolean;
};

export type AiAdapter = (anfrage: AiAnfrage) => Promise<AiRohantwort>;
