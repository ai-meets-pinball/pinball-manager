"use server";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { machines, troubleshootingGuides } from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { anthropicModelFor, resolveProvider } from "@/lib/ai/provider";
import {
  OLLAMA_TEXT_MODEL,
  ollamaErrorMessage,
  ollamaJson,
} from "@/lib/ai/ollama";
import {
  troubleshootingGuideJsonSchema,
  troubleshootingGuideSchema,
} from "@/lib/validators";

/*
  Phase-3-Funktion: Troubleshooting-Guide je Flipper.

  Ausgangslage: Wenn ein Handbuch hochgeladen wurde (Lampenmatrix o. ä. liegt in
  machine_data), bieten wir zusätzlich einen umfassenden FAQ- & Troubleshooting-
  Guide an. Er wird von Claude erzeugt — mit Websuche, damit Plattform und
  bekannte Serienfehler gegen Community-Quellen (IPDB/PinWiki/Pinside) verifiziert
  werden können.

  Anders als beim Handbuch-Upload gibt es hier KEIN Copyright-Thema: Der Guide ist
  von Claude generierter Text, kein Auszug aus dem Handbuch. Er darf gespeichert
  werden (troubleshooting_guides, genau eine Zeile je Maschine). Autorisierung
  erbt über die Maschine (kein RLS), erzeugen darf nur, wer schreiben darf.

  Ausgabe ist bewusst strukturiertes JSON (Abschnitte aus Text-/Warn-/Tabellen-
  Blöcken), passend zur bestehenden „Service-Console"-Darstellung — kein Markdown.
*/

export type GuideState = { error?: string; ok?: boolean };

/*
  Der Systemprompt (Persona + Guide-Spezifikation). Die Flipperdaten werden direkt
  aus der aktuell aufgerufenen Maschine übernommen; System/Plattform bleibt offen,
  damit Schritt 0 sie selbst bestimmt.
*/
function buildSystemPrompt(machine: {
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
  Anweisung, das Ergebnis in unser strukturiertes JSON zu gießen. Das eigentliche
  Format wird zusätzlich über output_config (json_schema) erzwungen; diese Zeilen
  erklären dem Modell die Zuordnung von Guide-Bestandteilen zu Blocktypen.
*/
const OUTPUT_INSTRUCTION = `Erstelle jetzt den Guide für den oben beschriebenen Flipper und gib ihn AUSSCHLIESSLICH als JSON zurück, das dem vorgegebenen Schema entspricht:
- "plattform": die in Schritt 0 identifizierte Plattform/Geräte-Generation (kurz).
- "abschnitte": die oben genannten Abschnitte 1–7, je mit "titel" und "bloecke".
- Ein Block ist entweder:
  - {"typ":"text","text": ...} für Fließtext (nutze "\\n" für Absätze/Aufzählungen),
  - {"typ":"warnung","text": ...} für Sicherheits-/Gefahrenhinweise,
  - {"typ":"tabelle","titel": ...,"spalten":[...],"zeilen":[[...]]} für die
    Symptom-Diagnose-Tabellen (Spalten z.B. ["Symptom","Wahrscheinliche Ursache(n)","Diagnose-Schritte","Lösung"]).
- "quellen": die Quellenliste am Ende (Manual-Nr. falls bekannt, IPDB-Eintrag, PinWiki-Kapitel).
Kein Markdown, keine Backticks — nur das JSON-Objekt.`;

/** JSON aus dem Antworttext lösen (falls das Modell etwas umrahmt). */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/** API-/Netzwerkfehler in eine sichere, spezifische Meldung übersetzen. */
function apiErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Anthropic.AuthenticationError) return "Claude-API-Key ist ungültig.";
  if (e instanceof Anthropic.PermissionDeniedError)
    return "Kein Zugriff auf Claude (Rechte oder Guthaben prüfen).";
  if (e instanceof Anthropic.NotFoundError)
    return "Modell nicht verfügbar — ANTHROPIC_MODEL prüfen.";
  if (e instanceof Anthropic.InternalServerError || /overloaded|\b529\b/i.test(msg))
    return "Claude ist gerade überlastet. Bitte in ein paar Minuten erneut versuchen.";
  if (e instanceof Anthropic.RateLimitError || /rate[_ -]?limit|\b429\b/i.test(msg))
    return "Zu viele Anfragen an Claude. Bitte kurz warten und erneut versuchen.";
  if (e instanceof Anthropic.APIConnectionError || /connection|fetch failed|network|ECONN/i.test(msg))
    return "Verbindung zu Claude fehlgeschlagen. Bitte später erneut versuchen.";
  return `Guide konnte nicht erstellt werden: ${msg.slice(0, 200)}`;
}

/*
  Streamt den Guide-Call und liefert die vollständige Antwort. Streaming, weil die
  Ausgabe groß ist (sonst HTTP-Timeout) und der Call mit Websuche minutenlang laufen
  kann. Websuche ist ein Server-Tool: Claude sucht selbst, das Ergebnis erzwingt
  output_config als unser JSON. Erreicht die serverseitige Tool-Schleife ihr Limit
  (stop_reason "pause_turn"), setzen wir den Turn fort (begrenzt).
*/
async function anthropicCall(
  apiKey: string,
  system: string,
  model: string,
  useBasicWebSearch: boolean,
) {
  const client = new Anthropic({ apiKey, maxRetries: 4 });
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: OUTPUT_INSTRUCTION },
  ];

  // Haiku (200k-Kontext) unterstützt nur die einfache Websuche-Variante; die
  // neuere web_search_20260209 gibt es nur auf Opus/Sonnet.
  const webSearch = useBasicWebSearch
    ? { type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 6 }
    : { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 6 };

  let response: Anthropic.Message | undefined;
  for (let i = 0; i < 4; i++) {
    response = await client.messages
      .stream({
        model,
        max_tokens: 32000,
        system,
        output_config: {
          format: { type: "json_schema", schema: troubleshootingGuideJsonSchema },
        },
        tools: [webSearch],
        messages,
      })
      .finalMessage();

    // pause_turn: Server-Tool-Schleife pausiert — Assistant-Turn anhängen und fortsetzen.
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }
  return response as Anthropic.Message;
}

export async function generateTroubleshootingGuide(
  _prev: GuideState,
  formData: FormData,
): Promise<GuideState> {
  const machineId = String(formData.get("machineId"));
  // Autorisierung: Eigentümer ODER Club-Mitglied (kein RLS). Wirft sonst.
  const { user } = await requireMachineWrite(machineId);

  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, machineId),
  });
  if (!machine) return { error: "Maschine nicht gefunden." };

  // Zwei Wege (siehe lib/ai/provider.ts): Claude (Standard, MIT Websuche) oder
  // lokal via Ollama (OHNE Websuche — Server-Tool ohne lokales Äquivalent). Der
  // Guide-Systemprompt hedged bereits („Falls Websuche verfügbar …") und
  // degradiert damit sauber. `websuche` wird gespeichert und in der Anzeige
  // kenntlich gemacht, damit die geringere Verlässlichkeit sichtbar ist.
  const provider = resolveProvider(formData);
  const system = buildSystemPrompt(machine);
  // Claude (Sonnet ODER Haiku) sucht im Web; nur der lokale Ollama-Pfad nicht.
  const websuche = provider !== "ollama";
  const usedModel =
    provider === "ollama" ? OLLAMA_TEXT_MODEL : anthropicModelFor(provider);

  let jsonText: string;
  if (provider === "ollama") {
    // Lokaler Pfad: kein API-Key, keine Websuche/Tool-Schleife — ein Call.
    try {
      jsonText = await ollamaJson({
        system,
        prompt: OUTPUT_INSTRUCTION,
        schema: troubleshootingGuideJsonSchema,
      });
    } catch (e) {
      console.error("[troubleshooting] ollama:", (e as Error).message);
      return { error: ollamaErrorMessage(e) };
    }
  } else {
    // Claude-Pfad (Standard). Ephemerer BYO-Schlüssel: nur für diesen Request,
    // nie gespeichert/geloggt; fällt auf den zentralen Env-Key zurück.
    const apiKey =
      String(formData.get("apiKey") ?? "").trim() || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        error: "Kein Claude-API-Schlüssel vorhanden. Bitte deinen eigenen eingeben.",
      };
    }

    let response: Anthropic.Message;
    try {
      response = await anthropicCall(apiKey, system, usedModel, provider === "auto");
    } catch (e) {
      console.error("[troubleshooting] API:", (e as Error).message);
      return { error: apiErrorMessage(e) };
    }

    console.error(
      `[troubleshooting] ${machine.hersteller} ${machine.modell}: in=${response.usage.input_tokens} out=${response.usage.output_tokens} tokens, stop=${response.stop_reason}`,
    );

    if (response.stop_reason === "refusal") {
      return { error: "Die Erstellung wurde abgelehnt." };
    }
    if (response.stop_reason === "max_tokens") {
      return {
        error:
          "Der Guide wurde zu lang und abgeschnitten. Bitte erneut versuchen.",
      };
    }
    if (response.stop_reason === "pause_turn") {
      return { error: "Die Websuche dauerte zu lange. Bitte erneut versuchen." };
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Es konnte kein Guide erzeugt werden. Bitte erneut versuchen." };
    }
    jsonText = textBlock.text;
  }

  let parsed: ReturnType<typeof troubleshootingGuideSchema.parse>;
  try {
    parsed = troubleshootingGuideSchema.parse(JSON.parse(extractJson(jsonText)));
  } catch (e) {
    console.error("[troubleshooting] parse:", (e as Error).message);
    return { error: "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen." };
  }

  // Genau eine Zeile je Maschine — vorhandenen Guide ersetzen (upsert über machineId).
  await db
    .insert(troubleshootingGuides)
    .values({
      machineId,
      daten: parsed,
      model: usedModel,
      websuche,
      erstelltVon: user.id,
    })
    .onConflictDoUpdate({
      target: troubleshootingGuides.machineId,
      set: {
        daten: parsed,
        model: usedModel,
        websuche,
        erstelltVon: user.id,
        createdAt: new Date(),
      },
    });

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
