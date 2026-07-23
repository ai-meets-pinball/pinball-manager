/*
  KI-Anbieter-Umschaltung (Lehrbeispiel: bewusst sichtbar statt versteckt).

  Standard ist Anthropic (Claude) — so läuft die produktive Vercel-Deployment
  unverändert. Optional lässt sich ein LOKALES Modell über Ollama einschalten
  (AI_PROVIDER=ollama), gedacht für lokale/self-hosted Läufe: das Handbuch bleibt
  komplett auf der Maschine (passt zur Copyright-Pipeline). Auf Vercel ist ein
  Ollama unter localhost NICHT erreichbar — der Ollama-Pfad ist kein Cloud-Pfad.

  Diese Datei importiert bewusst KEIN SDK, damit sie auch aus einer Server-
  Component (page.tsx) billig importierbar ist.
*/

// "anthropic" = Claude Sonnet (höchste Qualität, via ANTHROPIC_MODEL);
// "auto"      = günstig zuerst (Haiku) und nur bei leerem Ergebnis auf Sonnet
//               hochschalten — spart, wo Haiku reicht, bleibt aber zuverlässig;
// "ollama"    = lokales Modell. Alle Claude-Wege teilen sich Key & Code.
export type AiProvider = "anthropic" | "auto" | "ollama";

// Modell für die günstige Auto-Stufe bzw. den Sonnet-Fallback.
export const HAIKU_MODEL = () => process.env.ANTHROPIC_HAIKU_MODEL || "claude-haiku-4-5";
export const SONNET_MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/** Standard-Anbieter (Vorauswahl). Claude‑Sonnet, außer AI_PROVIDER=ollama. */
export function getAiProvider(): AiProvider {
  return process.env.AI_PROVIDER === "ollama" ? "ollama" : "anthropic";
}

/** Claude-Modell-ID je Anbieter. "auto" startet mit dem günstigen Haiku (der
    Fallback auf Sonnet steckt in der Extraktion), "anthropic" = Sonnet. */
export function anthropicModelFor(provider: AiProvider): string {
  return provider === "auto" ? HAIKU_MODEL() : SONNET_MODEL();
}

/** Claude-PDF-Seitenlimit je Stufe: Haiku (200k-Kontext) 100, Sonnet (1M) 600.
    "auto" startet mit Haiku → 100 (die Pakete passen dann auch für den Sonnet-
    Fallback). Größere Handbücher werden in solche Pakete geteilt (split-pdf.ts). */
export function claudePdfMaxPages(provider: AiProvider): number {
  return provider === "auto" ? 100 : 600;
}

/*
  Welche Anbieter stehen dem Nutzer zur Auswahl? Sind mehrere verfügbar, darf er
  je Aktion bewusst wählen (Auswahl im Formular). Regeln:
  - Ollama: verfügbar, sobald es konfiguriert ist (AI_PROVIDER=ollama oder eine
    OLLAMA_BASE_URL gesetzt).
  - Anthropic: verfügbar mit zentralem Key — oder wenn Ollama NICHT verfügbar ist
    (dann ist Claude der einzige Weg, ggf. über den eigenen BYO-Schlüssel).
  Der Standard-Anbieter (getAiProvider) steht vorne → Vorauswahl im UI.
*/
export function availableProviders(): AiProvider[] {
  const ollamaConfigured =
    process.env.AI_PROVIDER === "ollama" || Boolean(process.env.OLLAMA_BASE_URL);
  const anthropicConfigured =
    Boolean(process.env.ANTHROPIC_API_KEY) || !ollamaConfigured;

  // Claude bietet zwei Stufen zur Wahl: "auto" (günstig, mit Sonnet-Fallback) und
  // "anthropic" (immer Sonnet). Beide über denselben Key/Weg.
  const list: AiProvider[] = [];
  if (anthropicConfigured) list.push("anthropic", "auto");
  if (ollamaConfigured) list.push("ollama");

  const def = getAiProvider();
  return list.sort((a, b) => (a === def ? -1 : b === def ? 1 : 0));
}

/*
  Den vom Nutzer gewählten Anbieter aus dem Formular lesen (Feld „provider") und
  gegen die tatsächlich verfügbaren prüfen. Fällt auf den Standard zurück, falls
  nichts oder etwas Unerwartetes ankommt — die Auswahl ist also nie erzwingbar
  auf einen nicht konfigurierten Anbieter.
*/
export function resolveProvider(formData: FormData): AiProvider {
  const raw = String(formData.get("provider") ?? "");
  const avail = availableProviders();
  if (
    (raw === "anthropic" || raw === "auto" || raw === "ollama") &&
    avail.includes(raw)
  ) {
    return raw;
  }
  return avail[0] ?? getAiProvider();
}
