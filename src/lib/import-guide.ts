import { sliceJsonObject } from "@/lib/import-facts";
import {
  troubleshootingGuideSchema,
  type TroubleshootingGuide,
} from "@/lib/validators";

/*
  Troubleshooting-Guide als JSON-Import (Alternative zur KI-Generierung in der
  App) — dasselbe Prinzip wie beim Handbuch-Fakten-Import (lib/import-facts.ts):
  der Nutzer kopiert einen fertigen Prompt, lässt den Guide extern (z. B. in
  ChatGPT) erzeugen und fügt das JSON hier ein. `parseImportedGuide` ist die
  EINE Validierungsfunktion — sie läuft clientseitig für die Vorschau UND
  serverseitig autoritativ in der Import-Action (db/actions/machine-data.ts).

  Reines Modul (keine DB, kein "use server") — deshalb liegen hier auch der
  Guide-Systemprompt und die Output-Instruktion, die lib/troubleshooting.ts
  ("use server", darf nur async-Funktionen exportieren) für die KI-Generierung
  importiert. So können Generierungs- und Import-Prompt nie auseinanderlaufen.
*/

/*
  Der Systemprompt (Persona + Guide-Spezifikation). Die Flipperdaten werden direkt
  aus der aktuell aufgerufenen Maschine übernommen; System/Plattform bleibt offen,
  damit Schritt 0 sie selbst bestimmt.
*/
export function buildGuideSystemPrompt(machine: {
  hersteller: string;
  modell: string;
  baujahr: number | null;
}): string {
  const baujahr = machine.baujahr ? String(machine.baujahr) : "unbekannt";
  return `Du bist ein erfahrener Flipper-Techniker mit jahrzehntelanger Erfahrung über alle
Geräte-Generationen hinweg: elektromechanische Geräte (EM), frühe Solid-State-Geräte,
DMD-Ära und moderne Plattformen mit Node-Boards und LCD.

Erstelle einen umfassenden FAQ- und Troubleshooting-Guide für folgenden Flipper:

Hersteller: ${machine.hersteller}
Modell: ${machine.modell}
Optionale Zusatzangaben (nur ausfüllen, wenn bekannt):
- Baujahr: ${baujahr}
- System/Plattform: (nicht angegeben — in Schritt 0 selbst bestimmen)
- Bekannter Zustand / aktuelle Symptome: (keine besonderen Angaben)
Zielgruppe: Verein mit Werkstatt sowie ambitionierte Heimanwender mit Multimeter und Lötkolben

SCHRITT 0 — Plattform identifizieren (immer zuerst, vor dem eigentlichen Guide):
Bestimme anhand von Hersteller, Modell und ggf. Baujahr die exakte Plattform und
Geräte-Generation. Falls dir Websuche zur Verfügung steht, verifiziere Plattform und
bekannte Serienprobleme in Community-Quellen (IPDB, PinWiki, Pinside). Nenne die
identifizierte Plattform explizit am Anfang des Guides. Der GESAMTE folgende Guide
muss zu dieser Plattform passen — keine Konzepte aus anderen Generationen übertragen
(z.B. keine Schaltermatrix bei EM-Geräten, keine Score-Reels bei DMD-Geräten, keine
klassischen Sicherungsplatinen bei Node-Board-Systemen).

Struktur des Guides:

1. Sicherheitshinweise, spezifisch für diese Plattform: Netzspannung, ggf.
   Hochspannung (z.B. Display-HV, Score-Motor-Kreise), Kondensatoren, Besonderheiten
   beim Öffnen. Nur real vorhandene Gefahren dieser Plattform nennen.

2. Systematische Fehlersuche nach Subsystemen, jeweils als Tabelle
   "Symptom | Wahrscheinliche Ursache(n) | Diagnose-Schritte | Lösung".
   Wähle die Subsysteme passend zur Plattform, decke aber mindestens ab:
   - Stromversorgung (Sicherungen, Gleichrichter/Netzteile bzw. bei EM: Trafo,
     Sicherungen, Verkabelung)
   - Spielsteuerung (CPU/Boot-Verhalten und Fehlercodes bei Solid State;
     Relais-Logik, Stepper und Score-Motor bei EM; Node-Board-Kommunikation
     bei modernen Geräten)
   - Spulen und deren Ansteuerung (Flipper, Slingshots, Pop Bumper, Kicker)
   - Schalter (Schaltermatrix und Optos bei SS; Blattschalter-Ketten und
     Kontaktreinigung bei EM)
   - Beleuchtung (Lampenmatrix/GI bzw. serielle LED-Ketten bei modernen Geräten)
   - Anzeige (Score-Reels, Segmentanzeigen, DMD oder LCD — je nach Gerät,
     mit den jeweils typischen Ausfallbildern)
   - Sound (falls vorhanden; Chime-Einheit bei EM gilt als Sound)
   - Modellspezifische Mechaniken und Features dieses Geräts

3. Modellspezifische bekannte Probleme: Die in der Community dokumentierten
   Schwachstellen und Serienfehler DIESES Modells, je mit Symptom, Ursache,
   bewährter Lösung. Kennzeichne, was Plattform-typisch ist (betrifft alle
   Geräte dieses Systems) und was wirklich modellspezifisch ist.

4. Diagnose-Möglichkeiten: Bei Solid-State- und modernen Geräten: Weg ins
   Service-/Testmenü dieser Plattform, wichtigste Tests (Schalter, Spulen,
   Lampen) und Bedeutung typischer Fehlermeldungen. Bei EM-Geräten stattdessen:
   systematisches Vorgehen mit Schaltplan, manuelle Relais-/Stepper-Prüfung
   und sinnvolle Messpunkte.

5. FAQ-Teil: 10-15 häufige Fragen zu Betrieb, Wartung und Einstellung dieses
   Modells, mit kurzen, praxisnahen Antworten. Mische plattformtypische
   Klassiker mit modellspezifischen Fragen.

6. Wartungsplan mit Intervallen, angepasst an die Plattform (z.B. Kontaktpflege
   und Stepper-Reinigung bei EM; Batterie-/NVRAM-Thema nur, wo es die Plattform
   betrifft; bei modernen Geräten Firmware-Updates erwähnen).

7. Werkzeug und Ersatzteile: Grundausstattung plus die für DIESE Plattform und
   DIESES Modell sinnvollen Vorratsteile (z.B. passende Sicherungswerte,
   typische Transistoren/Treiber, Kontaktsätze bei EM, schwer beschaffbare
   Modellteile).

Formatvorgaben:
- Deutsch, gängige englische Fachbegriffe der Szene beibehalten
  (z.B. Coil, Switch Matrix, GI, Score Motor).
- Tabellen für die Symptom-Diagnose-Abschnitte, Fließtext nur wo nötig.
- Immer vom einfachsten/wahrscheinlichsten zum komplexesten Fehler vorgehen.
- Konkrete Sollwerte (Spannungen, typische Spulenwiderstände) nur angeben, wenn
  sie für diese Plattform belastbar dokumentiert sind; sonst auf Manual und
  Schaltplan verweisen statt Werte zu erfinden.
- Arbeiten, die Elektronikkenntnisse erfordern oder gefährlich sind, deutlich
  mit Warnhinweis kennzeichnen.
- Nenne am Ende die Quellen, mit denen der Leser den Guide gegenprüfen sollte
  (Original-Manual mit Nummer falls bekannt, IPDB-Eintrag, PinWiki-Kapitel).`;
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
            spalten: ["Symptom", "Wahrscheinliche Ursache(n)", "Diagnose-Schritte", "Lösung"],
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
export function buildGuideImportPrompt(machine: {
  hersteller: string;
  modell: string;
  baujahr: number | null;
}): string {
  return `${buildGuideSystemPrompt(machine)}

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

/** Prüft und bewertet importiertes Guide-JSON (Vorschau + Server-Import). */
export function parseImportedGuide(raw: string): GuideImportResult {
  const warnings: string[] = [];

  const slice = sliceJsonObject(raw ?? "");
  if (!slice) {
    return {
      ...LEER,
      warnings,
      errors: ["Kein JSON-Objekt gefunden. Füge die JSON-Ausgabe aus ChatGPT ein."],
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(slice);
  } catch {
    return {
      ...LEER,
      warnings,
      errors: ["Kein gültiges JSON — bitte die komplette, unveränderte Ausgabe einfügen."],
    };
  }

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
    warnings.push("Umschlag mit „guide“-Schlüssel erkannt — inneres Guide-Objekt verwendet.");
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
      errors: ["Der Guide enthält keine Abschnitte — es gibt nichts zu importieren."],
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
    warnings.push("Keine Quellen angegeben — der Guide lässt sich schwerer gegenprüfen.");
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
