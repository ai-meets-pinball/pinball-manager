/*
  Lokaler KI-Pfad über MLX (siehe provider.ts). SERVER-ONLY: niemals aus einer
  Client-Komponente importieren.

  Kein SDK — ein schlichter `fetch` an den lokal (localhost) selbst gehosteten
  MLX-Server. Wir betreiben zwei Prozesse:
    - TEXT: `mlx_lm.server` mit einem Long-Context-Modell (Qwen2.5-…-1M) — das
      ganze Handbuch passt in EINEN Kontext (kein 32k-Cut wie bei Ollama).
    - OCR:  ein `mlx-vlm`-Server (z. B. Qwen2.5-VL) — gescannte Seiten → Text.
  Beide sprechen zufällig die OpenAI-Chat-Completions-Form; das ist nur die API
  des Servers, kein Ziel — deshalb bleibt dieser Client bewusst minimal.

  Wie beim Claude-/Ollama-Pfad geben die Funktionen einen ROHEN String zurück,
  damit die Features ihren Schwanz (extractJson → JSON.parse → zod → DB)
  unverändert weiterbenutzen. `mlx_lm.server` kennt kein `response_format`; die
  JSON-Form wird per Anweisung erbeten und downstream durch zod abgesichert.

  Nur lokal — auf Vercel ist ein localhost-MLX NICHT erreichbar.
*/

// URLs schließen den /v1-Pfad ein (z. B. http://localhost:8082/v1).
const TEXT_URL = process.env.MLX_TEXT_URL || "http://localhost:8082/v1";
const TEXT_MODEL =
  process.env.MLX_TEXT_MODEL || "mlx-community/Qwen2.5-7B-Instruct-1M-4bit";
const OCR_URL = process.env.MLX_OCR_URL || ""; // leer = kein OCR-Server
const OCR_MODEL =
  process.env.MLX_OCR_MODEL || "mlx-community/Qwen2.5-VL-7B-Instruct-4bit";

export const MLX_TEXT_URL = TEXT_URL;
export const MLX_TEXT_MODEL = TEXT_MODEL;
export const MLX_OCR_URL = OCR_URL;

/** Ist ein OCR-Server konfiguriert? Ohne ihn gibt es keinen Scan-Pfad. */
export function mlxOcrConfigured(): boolean {
  return Boolean(OCR_URL);
}

type MlxTextArgs = {
  system?: string;
  prompt: string;
  /** Dasselbe JSON-Schema wie bei Claude/Ollama — hier als Textanweisung
      eingebettet (der Server erzwingt die Form nicht). */
  schema?: object;
  model?: string;
};

/*
  Ein Text-Call an mlx_lm.server (non-streaming: liefert `usage` und ist
  einfacher). temperature 0 = deterministisch; max_tokens großzügig, damit die
  Extraktions-/Guide-JSONs nicht abgeschnitten werden (finish_reason "length").
*/
export async function mlxText({
  system,
  prompt,
  schema,
  model,
}: MlxTextArgs): Promise<string> {
  const jsonHinweis = schema
    ? `\n\nAntworte AUSSCHLIESSLICH mit einem einzigen gültigen JSON-Objekt nach diesem Schema (keine Erklärung, kein Markdown, keine Code-Fences):\n${JSON.stringify(schema)}`
    : "";

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt + jsonHinweis });

  const res = await fetch(`${TEXT_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? TEXT_MODEL,
      messages,
      max_tokens: 8192,
      temperature: 0,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`MLX ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/*
  OCR gescannter Seiten (base64-PNGs ohne data:-Präfix) → zusammengeführter Text.
  Eine Anfrage je Seite an den mlx-vlm-Server (Bild→Text). Der Rückgabetext geht
  danach in denselben mlxText-Struktur-Call wie ein digitales Handbuch
  (2-stufig OCR → Text → JSON).
*/
export async function mlxOcr(images: string[]): Promise<string> {
  if (!OCR_URL) {
    throw new Error(
      "Kein OCR-Server konfiguriert (MLX_OCR_URL). Gescannte Handbücher brauchen einen mlx-vlm-Server oder Claude.",
    );
  }
  const seiten: string[] = [];
  for (const b64 of images) {
    const res = await fetch(`${OCR_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OCR_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Gib den GESAMTEN Text dieser Handbuchseite wieder — inklusive Tabellen (Spalten mit | trennen, eine Zeile je Zeile). Nur den Seiteninhalt, keine Erklärung.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${b64}` },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0,
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `MLX-OCR ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    seiten.push(data.choices?.[0]?.message?.content ?? "");
  }
  return seiten.join("\n\n");
}

/** MLX-Fehler in eine sichere, spezifische deutsche Meldung übersetzen. */
export function mlxErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (
    /ECONNREFUSED|fetch failed|ENOTFOUND|EAI_AGAIN|Failed to fetch|network|socket/i.test(
      msg,
    )
  )
    return `MLX-Server nicht erreichbar (${TEXT_URL}). Läuft mlx_lm.server? Siehe docs/MLX_SETUP.md`;
  if (/timeout|abort|ETIMEDOUT/i.test(msg))
    return "Das lokale MLX-Modell hat zu lange gebraucht (Cold-Start oder sehr langer Kontext). Bitte erneut versuchen.";
  return `Lokales MLX-Modell fehlgeschlagen: ${msg.slice(0, 300)}`;
}
