import { sliceJsonObject } from "@/lib/import-facts";
import { DEFAULT_PROMPTS, renderPrompt } from "@/lib/prompts";
import {
  troubleshootingGuideSchema,
  type TroubleshootingGuide,
} from "@/lib/validators";

/*
  Troubleshooting-Guide als JSON-Import (Alternative zur KI-Generierung in der
  App) — dasselbe Prinzip wie beim Handbuch-Fakten-Import (lib/import-facts.ts):
  der Nutzer kopiert einen fertigen Prompt, lässt den Guide extern (z. B. in
  ChatGPT) erzeugen und fügt das JSON hier ein. `parseGuideText` ist die
  EINE Validierungsfunktion — sie läuft clientseitig für die Vorschau UND
  serverseitig autoritativ in der Import-Action (db/actions/machine-data.ts).

  Reines Modul (keine DB, kein "use server") — deshalb liegen hier auch der
  Guide-Systemprompt und die Output-Instruktion, die lib/troubleshooting.ts
  ("use server", darf nur async-Funktionen exportieren) für die KI-Generierung
  importiert. So können Generierungs- und Import-Prompt nie auseinanderlaufen.
*/

/*
  Der Guide-Systemprompt lebt als STANDARD in der Registry (lib/prompts.ts, key
  "guide_system"); hier nur ein dünner Delegat, der die Flipperdaten der Maschine
  einsetzt. Für die KI-Generierung wird der Prompt über resolvePrompt aufgelöst
  (ggf. Hersteller-/Generation-Override); dieser Delegat liefert den Code-Standard
  z. B. als Fallback bzw. für den kopierbaren Import-Prompt.
*/
export function buildGuideSystemPrompt(machine: {
  hersteller: string;
  modell: string;
  baujahr: number | null;
}): string {
  return renderPrompt(DEFAULT_PROMPTS.guide_system.vorlage, {
    hersteller: machine.hersteller,
    modell: machine.modell,
    baujahr: machine.baujahr ? String(machine.baujahr) : "unbekannt",
  });
}

/*
  Anweisung, das Ergebnis in unser strukturiertes JSON zu gießen. Bei der
  KI-Generierung wird das Format zusätzlich über output_config (json_schema)
  erzwungen; diese Zeilen erklären dem Modell die Zuordnung von
  Guide-Bestandteilen zu Blocktypen.
*/
export const GUIDE_OUTPUT_INSTRUCTION = `Erstelle jetzt den Guide für den oben beschriebenen Flipper und gib ihn AUSSCHLIESSLICH als JSON zurück, das dem vorgegebenen Schema entspricht:
- "plattform": die in Schritt 0 identifizierte Plattform/Geräte-Generation (kurz).
- "abschnitte": die oben genannten Abschnitte 1–7, je mit "titel" und "bloecke".
- Ein Block ist entweder:
  - {"typ":"text","text": ...} für Fließtext (nutze "\\n" für Absätze/Aufzählungen),
  - {"typ":"warnung","text": ...} für Sicherheits-/Gefahrenhinweise,
  - {"typ":"tabelle","titel": ...,"spalten":[...],"zeilen":[[...]]} für die
    Symptom-Diagnose-Tabellen (Spalten z.B. ["Symptom","Wahrscheinliche Ursache(n)","Diagnose-Schritte","Lösung"]).
- "quellen": die Quellenliste am Ende (Manual-Nr. falls bekannt, IPDB-Eintrag, PinWiki-Kapitel).
Kein Markdown, keine Backticks — nur das JSON-Objekt.`;

// Skelett für den Import-Prompt: externe LLMs bekommen kein erzwungenes
// json_schema, also zeigen wir die exakte Form. `satisfies` hält das Beispiel
// in Sync mit troubleshootingGuideSchema (Schemaänderung = Compile-Fehler).
const EXAMPLE = JSON.stringify(
  {
    plattform: "z.B. Williams WPC-89",
    abschnitte: [
      {
        titel: "1. Sicherheitshinweise",
        bloecke: [
          { typ: "text", text: "Fließtext …" },
          { typ: "warnung", text: "Gefahrenhinweis …" },
          {
            typ: "tabelle",
            titel: "Stromversorgung",
            spalten: [
              "Symptom",
              "Wahrscheinliche Ursache(n)",
              "Diagnose-Schritte",
              "Lösung",
            ],
            zeilen: [["…", "…", "…", "…"]],
          },
        ],
      },
    ],
    quellen: ["Original-Manual …", "IPDB-Eintrag …"],
  } satisfies TroubleshootingGuide,
  null,
  2,
);

/** Der komplette Prompt für ChatGPT & Co. (per „kopieren"-Button in der UI) —
    maschinenspezifisch, weil Hersteller/Modell/Baujahr eingebettet werden. */
export function buildGuideImportPrompt(
  machine: {
    hersteller: string;
    modell: string;
    baujahr: number | null;
  },
  /** Aufgelöster System-Prompt (Registry/Override). Fällt sonst auf den
      Code-Standard zurück. */
  systemPrompt?: string,
): string {
  return `${systemPrompt ?? buildGuideSystemPrompt(machine)}

${GUIDE_OUTPUT_INSTRUCTION}

Da dir hier kein Schema technisch vorgegeben wird: halte dich EXAKT an diese
JSON-Form (gleiche Schlüssel, gleiche Verschachtelung — die Werte sind nur
Platzhalter, die Abschnitte 1–7 kommen alle in "abschnitte"):

${EXAMPLE}

Regeln:
- Falls dir Websuche zur Verfügung steht, nutze sie (Plattform und Serienfehler
  gegen IPDB, PinWiki, Pinside verifizieren) und nenne die Quellen in "quellen".
- Antworte NUR mit dem JSON — keine Erklärung, kein Markdown, keine \`\`\`-Codezäune.`;
}

export type GuideImportResult = {
  /** true = keine harten Fehler UND mindestens ein Abschnitt. */
  ok: boolean;
  /** validierter, importfertiger Guide (nur wenn ok). */
  guide?: TroubleshootingGuide;
  plattform: string;
  abschnitte: number;
  bloecke: number;
  /** davon Tabellen-Blöcke. */
  tabellen: number;
  quellen: number;
  warnings: string[];
  errors: string[];
};

const LEER: Omit<GuideImportResult, "warnings" | "errors"> = {
  ok: false,
  plattform: "",
  abschnitte: 0,
  bloecke: 0,
  tabellen: 0,
  quellen: 0,
};

/**
 * Wie `parseGuide`, aber für eingefügten TEXT: schneidet das JSON aus Prosa
 * bzw. Code-Zäunen heraus und parst es. Für den Einfüge-Pfad in der Oberfläche.
 */
export function parseGuideText(raw: string): GuideImportResult {
  const slice = sliceJsonObject(raw ?? "");
  if (!slice) {
    return {
      ...LEER,
      warnings: [],
      errors: [
        "Kein JSON-Objekt gefunden. Füge die JSON-Ausgabe aus ChatGPT ein.",
      ],
    };
  }
  try {
    return parseGuide(JSON.parse(slice));
  } catch {
    return {
      ...LEER,
      warnings: [],
      errors: [
        "Kein gültiges JSON — bitte die komplette, unveränderte Ausgabe einfügen.",
      ],
    };
  }
}

/**
 * Prüft und bewertet Guide-Daten — die EINE Kette vor dem Speichern, für
 * BEIDE Wege: die KI-Antwort und das eingefügte JSON. Vorher bekam nur der
 * Einfüge-Pfad die Umschlag-Toleranz und die Vollständigkeits-Warnungen.
 */
export function parseGuide(eingabe: unknown): GuideImportResult {
  const warnings: string[] = [];
  let data = eingabe;

  // Toleranz: wer versehentlich den gespeicherten Umschlag { guide, websuche,
  // model } einfügt, meint das innere Guide-Objekt.
  if (
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "guide" in data &&
    !("abschnitte" in data)
  ) {
    data = (data as { guide: unknown }).guide;
    warnings.push(
      "Umschlag mit „guide“-Schlüssel erkannt — inneres Guide-Objekt verwendet.",
    );
  }

  const parsed = troubleshootingGuideSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const pfad = issue?.path.length ? ` (bei „${issue.path.join(".")}“)` : "";
    return {
      ...LEER,
      warnings,
      errors: [
        `Das JSON passt nicht zur Guide-Struktur${pfad}: ${issue?.message ?? "ungültig"}. Bitte den kopierten Prompt unverändert verwenden.`,
      ],
    };
  }
  const guide = parsed.data;

  if (guide.abschnitte.length === 0) {
    return {
      ...LEER,
      plattform: guide.plattform,
      warnings,
      errors: [
        "Der Guide enthält keine Abschnitte — es gibt nichts zu importieren.",
      ],
    };
  }

  if (guide.abschnitte.length < 7) {
    warnings.push(
      `Nur ${guide.abschnitte.length} Abschnitte — der Standard-Guide hat 7 (Sicherheit bis Werkzeug/Ersatzteile).`,
    );
  }
  const leere = guide.abschnitte.filter((a) => a.bloecke.length === 0);
  if (leere.length > 0) {
    warnings.push(
      `Abschnitt(e) ohne Inhalt: ${leere.map((a) => `„${a.titel}“`).join(", ")}.`,
    );
  }
  if (guide.quellen.length === 0) {
    warnings.push(
      "Keine Quellen angegeben — der Guide lässt sich schwerer gegenprüfen.",
    );
  }
  if (!guide.plattform.trim()) {
    warnings.push("Keine Plattform angegeben (Schritt 0 des Prompts).");
  }

  const bloecke = guide.abschnitte.reduce((n, a) => n + a.bloecke.length, 0);
  const tabellen = guide.abschnitte.reduce(
    (n, a) => n + a.bloecke.filter((b) => b.typ === "tabelle").length,
    0,
  );

  return {
    ok: true,
    guide,
    plattform: guide.plattform,
    abschnitte: guide.abschnitte.length,
    bloecke,
    tabellen,
    quellen: guide.quellen.length,
    warnings,
    errors: [],
  };
}
