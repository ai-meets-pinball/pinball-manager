import { FACT_COLUMNS } from "@/lib/validators";
import { renderPlaceholders } from "@/lib/email-templates";

/*
  KI-Prompt-Registry: die STANDARD-Prompts liegen im Code, Abweichungen als
  Zeilen in `prompt_overrides` (global oder pro Hersteller/Generation). Diese
  Datei ist bewusst FREI von DB-Imports — sie wird auch vom Client genutzt
  (Editor-Vorschau, Platzhalter-Hinweise). Das Auflösen DB-über-Standard steckt
  in db/queries/prompts.ts (`resolvePrompt`).

  Editierbar ist nur die PROSA. Strukturelle Teile bleiben im Code:
  - die Fakten-Spalten (aus FACT_COLUMNS, als {{spalten}} eingesetzt),
  - die JSON-Ausgabe-Instruktion + Schemata (import-guide.ts / validators.ts).
  So kann eine bearbeitete Vorlage das Parsing nie brechen. `renderPlaceholders`
  ersetzt {{platzhalter}} und entfernt unbekannte.
*/
export const PROMPT_KEYS = [
  "guide_system",
  "extract",
  "maintenance_import",
  "repair_suggestion",
] as const;
export type PromptKey = (typeof PROMPT_KEYS)[number];

export type PromptDefinition = {
  label: string;
  beschreibung: string;
  /** Platzhalter, die der jeweilige Aufrufer füllt (nur Hinweis fürs Editieren). */
  platzhalter: string[];
  /** Darf pro Hersteller überschrieben werden? */
  herstellerScoped: boolean;
  /** Darf pro Generation überschrieben werden? */
  generationScoped: boolean;
  /** Standardtext mit {{platzhaltern}}. */
  vorlage: string;
};

/* Der Spaltenblock der Handbuch-Extraktion — strukturell fix, wird als
   {{spalten}} in den Extract-Prompt eingesetzt. */
export function extractSpaltenBlock(): string {
  const j = (t: keyof typeof FACT_COLUMNS) => JSON.stringify(FACT_COLUMNS[t]);
  return `- coils    → ${j("coils")}
- switches → ${j("switches")}
             (Switch-Matrix: Column/Row = Rasterposition; bei nicht-Matrix-Schaltern Column/Row = "".
              Typ = "opto" wenn es ein Opto-Schalter ist, sonst "mechanisch")
- lamps    → ${j("lamps")}
             (Lampenmatrix 8×8: Lamp/No = Column×10 + Row; also Column/Row aus der Nummer ableiten)
- fuses    → ${j("fuses")}
- parts    → ${j("parts")}
- rules    → ${j("rules")}
- screws   → ${j("screws")}
             (Schrauben-/Befestigungsliste: Größe/Gewinde, Anzahl, Einbauort — wenn im Handbuch vorhanden)
- rubbers  → ${j("rubbers")}
             (Gummiliste/Ring-Kit: Größe, Anzahl, Einbauort)
- electronics → ${j("electronics")}
             (nur diskrete Bauteile mit Wert/Bezeichnung — KEINE kompletten Schaltpläne)`;
}

export const DEFAULT_PROMPTS: Record<PromptKey, PromptDefinition> = {
  guide_system: {
    label: "Troubleshooting-Guide (System-Prompt)",
    beschreibung:
      "Persona + Struktur-Vorgabe für die KI-Generierung des Troubleshooting-Guides. Die JSON-Form wird zusätzlich strukturell erzwungen.",
    platzhalter: ["{{hersteller}}", "{{modell}}", "{{baujahr}}"],
    herstellerScoped: true,
    generationScoped: true,
    vorlage: `Du bist ein erfahrener Flipper-Techniker mit jahrzehntelanger Erfahrung über alle
Geräte-Generationen hinweg: elektromechanische Geräte (EM), frühe Solid-State-Geräte,
DMD-Ära und moderne Plattformen mit Node-Boards und LCD.

Erstelle einen umfassenden FAQ- und Troubleshooting-Guide für folgenden Flipper:

Hersteller: {{hersteller}}
Modell: {{modell}}
Optionale Zusatzangaben (nur ausfüllen, wenn bekannt):
- Baujahr: {{baujahr}}
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
  (Original-Manual mit Nummer falls bekannt, IPDB-Eintrag, PinWiki-Kapitel).`,
  },

  extract: {
    label: "Handbuch-Extraktion",
    beschreibung:
      "Weist die KI an, aus einem hochgeladenen Handbuch-PDF ausschließlich die technischen Referenztabellen zu extrahieren. Die Spaltenüberschriften ({{spalten}}) sind strukturell fix.",
    platzhalter: ["{{spalten}}"],
    herstellerScoped: true,
    generationScoped: false,
    vorlage: `Du erhältst das Handbuch eines Flipperautomaten als PDF.
Extrahiere AUSSCHLIESSLICH die technischen Referenztabellen, sofern im Handbuch vorhanden.
Verwende je Tabelle GENAU diese Spaltenüberschriften (in dieser Reihenfolge), auch wenn das Handbuch
sie anders benennt — ordne die Werte entsprechend zu; fehlt ein Wert, gib eine leere Zelle "":

{{spalten}}

Kabel-/Drahtfarben: Nennt das Handbuch bei Spulen oder Schaltern eine Kabel-/Drahtfarbe
(oft ein WPC-Zweiband-Code wie "Yel-Grn" oder "Red-Orn"), extrahiere sie IMMER mit in die
zugehörige Farb-/Kabel-Spalte — nie weglassen. Übernimm die Farbkürzel WÖRTLICH wie im
Handbuch (Orange erscheint je nach Handbuch als "Org" ODER "Orn" — nicht vereinheitlichen).

Regeln: NUR reine Fakten aus diesen Tabellen — KEINEN Fließtext, KEINE Spielregeln-Erklärungen,
KEINE ganzen Seiten, KEINE Beschreibungen. Fehlt eine Tabelle im Handbuch, gib für sie leere
"columns" und "rows" zurück. Halte dich kompakt, keine Duplikate, keine Wiederholungen.`,
  },

  maintenance_import: {
    label: "Wartungspunkte aus Guide",
    beschreibung:
      "System-Prompt, der den Wartungsplan-Abschnitt eines Guides in strukturierte, abhakbare Wartungspunkte umwandelt.",
    platzhalter: [],
    herstellerScoped: false,
    generationScoped: false,
    vorlage: `Du bist ein erfahrener Flipper-Wartungs-Techniker. Du bekommst den Wartungsplan-Abschnitt eines Troubleshooting-Guides und wandelst ihn in strukturierte, einzelne Wartungspunkte um.
Je Punkt: titel (kurz, prägnant), kategorie (z. B. Mechanik/Elektrik/Reinigung/Verschleiß/Elektronik/Beleuchtung), bauteil, taetigkeit (Prüfen/Reinigen/Ersetzen/Testen/Schmieren …), intervallTyp ("zeit" wenn ein Zeitintervall genannt ist, sonst "spiele" bei einer Spielzahl, sonst "bedarf"), intervallTage (Anzahl Tage NUR bei intervallTyp "zeit"; sonst 0), prioritaet, beschreibung (ein Satz).
Nur echte, abhakbare Wartungspunkte — keine Erklärtexte, keine Sicherheitshinweise, keine Duplikate.`,
  },

  repair_suggestion: {
    label: "Reparaturvorschlag zu einem Fehler",
    beschreibung:
      "Erzeugt zu einem gemeldeten Fehler einen Reparaturvorschlag (Diagnose, Maßnahme, Teile) aus dem vorhandenen Maschinen-Wissen. Füllt eine neue Reparatur vor.",
    platzhalter: [
      "{{hersteller}}",
      "{{modell}}",
      "{{baujahr}}",
      "{{symptom}}",
      "{{kategorie}}",
      "{{wissen}}",
    ],
    herstellerScoped: true,
    generationScoped: true,
    vorlage: `Du bist ein erfahrener Flipper-Reparatur-Techniker. Für den folgenden gemeldeten Fehler
sollst du einen konkreten, praxisnahen Reparaturvorschlag erstellen — vom wahrscheinlichsten,
einfachsten Ansatz zum komplexeren.

Gerät:
- Hersteller: {{hersteller}}
- Modell: {{modell}}
- Baujahr: {{baujahr}}

Gemeldeter Fehler:
- Kategorie: {{kategorie}}
- Symptom: {{symptom}}

Vorhandenes Wissen zu diesem Gerät (Handbuch-Fakten, Troubleshooting-Guide; kann leer sein):
{{wissen}}

Erstelle den Vorschlag mit:
- diagnose: die wahrscheinliche(n) Ursache(n) und wie man sie eingrenzt (Messpunkte, Tests),
  vom Naheliegenden zum Selteneren.
- massnahme: die konkreten Reparaturschritte in sinnvoller Reihenfolge; kennzeichne Arbeiten,
  die Elektronikkenntnisse erfordern oder gefährlich sind (Netzspannung/HV), mit Warnhinweis.
- teile: wahrscheinlich benötigte Teile/Verbrauchsmaterial (z. B. Sicherungswert, Transistor/Treiber,
  Kontaktsatz, Gummi) — leer lassen, wenn kein Teil nötig ist.
- hinweis: kurzer Sicherheits-/Unsicherheits-Hinweis; nenne, falls nötig, dass mit Manual/Schaltplan
  gegengeprüft werden soll. Erfinde keine konkreten Sollwerte, wenn sie nicht belastbar bekannt sind.

Deutsch, gängige englische Fachbegriffe der Szene beibehalten. Der Vorschlag ist ein Startpunkt und
muss vom Menschen geprüft werden.`,
  },
};

/** {{platzhalter}} in einer Vorlage ersetzen (unbekannte werden entfernt). */
export function renderPrompt(
  vorlage: string,
  vars: Record<string, string>,
): string {
  return renderPlaceholders(vorlage, vars);
}

export type PromptQuelle = "generation" | "hersteller" | "global" | "standard";
export type OverrideRow = {
  hersteller: string | null;
  generationId: string | null;
  vorlage: string;
};

/* Reine Auswahl des spezifischsten Overrides (Generation > Hersteller > global),
   sonst der Code-Standard. Ohne DB — damit die Reihenfolge testbar bleibt. */
export function waehleVorlage(
  key: PromptKey,
  overrides: OverrideRow[],
  ctx: { hersteller?: string | null; generationId?: string | null } = {},
): { vorlage: string; quelle: PromptQuelle } {
  const gen = ctx.generationId
    ? overrides.find((o) => o.generationId === ctx.generationId)
    : undefined;
  const her = ctx.hersteller
    ? overrides.find(
        (o) => o.hersteller === ctx.hersteller && o.generationId === null,
      )
    : undefined;
  const glob = overrides.find(
    (o) => o.hersteller === null && o.generationId === null,
  );
  const chosen = gen ?? her ?? glob;
  if (chosen) {
    return {
      vorlage: chosen.vorlage,
      quelle: gen ? "generation" : her ? "hersteller" : "global",
    };
  }
  return { vorlage: DEFAULT_PROMPTS[key].vorlage, quelle: "standard" };
}

/** Welche Pflicht-Platzhalter fehlen in einer Vorlage? Leer = alles da. Die
    Regel steht hier, damit Speichern-Knopf UND Action dasselbe prüfen. */
export function fehlendePlatzhalter(vorlage: string, platzhalter: string[]): string[] {
  return platzhalter.filter((p) => !vorlage.includes(p));
}

/** Gibt es für diesen Bereich (Hersteller ODER Generation) schon einen Override?
    Dann darf „Override anlegen" ihn nicht still überschreiben. */
export function overrideBelegt(
  overrides: OverrideRow[],
  bereich: { hersteller: string | null; generationId: string | null },
): boolean {
  return overrides.some(
    (o) => o.hersteller === bereich.hersteller && o.generationId === bereich.generationId,
  );
}
