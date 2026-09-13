import type { ImportResult } from "@/lib/import-facts";
import type { GuideImportResult } from "@/lib/import-guide";
import { FACT_COLUMNS, FACT_TYPES, type FactType } from "@/lib/validators";

/*
  Gezielte Tipps zur Import-Prüfung — und ein fertiger Nachfrage-Prompt für
  den nächsten Versuch im eigenen KI-Chat. Rein: setzt auf den Ergebnissen von
  parseFactsText/parseGuideText auf und ändert sie nicht.

  Warum: Fehler/Warnungen sagen, WAS nicht stimmt; wer den Prompt-Weg geht,
  braucht dazu, WORAN es liegt (abgeschnittene Antwort = Free-Konto, nur eine
  Tabelle kopiert, PDF nicht angehängt …) und WAS er dem Modell als Nächstes
  sagt. Die Nachfrage ist so formuliert, dass sie direkt in den laufenden
  Chat gehört — das Modell kennt den ursprünglichen Prompt ja noch.
*/
export type ImportTipps = {
  tipps: string[];
  /** Fertiger Folge-Prompt für den Chat — null, wenn es nichts nachzufragen gibt. */
  nachfrage: string | null;
};

const LABEL: Record<FactType, string> = {
  coils: "Spulen & Flasher",
  switches: "Schalter-Matrix",
  lamps: "Lampen-Matrix",
  fuses: "Sicherungen",
  parts: "Teileliste",
  rules: "Regeln / Adjustments",
  screws: "Schrauben",
  rubbers: "Gummiteile",
  electronics: "Elektronik-Bauteile",
};

/** Die Kern-Tabellen, die praktisch jedes Handbuch hat. */
const KERN: FactType[] = ["coils", "switches", "lamps", "fuses"];

const ABGESCHNITTEN_TIPP =
  "Die Ausgabe ist abgeschnitten — das JSON endet nicht mit der schließenden Klammer. Typisch für kostenlose Konten oder kurze Antwortlimits; ein stärkeres Modell bzw. Abo hilft, sonst „weiter“ verlangen.";

/** Sieht der Text nach einer abgebrochenen JSON-Ausgabe aus? */
export function siehtAbgeschnittenAus(raw: string): boolean {
  const t = raw.replace(/```[a-z]*/gi, "").trim();
  if (!t.includes("{")) return false;
  const auf = (t.match(/{/g) ?? []).length;
  const zu = (t.match(/}/g) ?? []).length;
  return !t.endsWith("}") || auf > zu;
}

function nachfrageAus(probleme: string[], schluss: string): string | null {
  if (probleme.length === 0) return null;
  return [
    "Deine letzte Antwort hatte folgende Probleme:",
    ...probleme.map((p) => `- ${p}`),
    "",
    schluss,
  ].join("\n");
}

export function tippsFuerFakten(raw: string, r: ImportResult): ImportTipps {
  const tipps: string[] = [];
  const probleme: string[] = [];
  const leer = raw.trim() === "";
  const hat = (teil: string) => r.errors.some((e) => e.includes(teil));

  if (leer) return { tipps: [], nachfrage: null };

  if (hat("Kein JSON-Objekt gefunden") && raw.trim().startsWith("[")) {
    // Ein nacktes Array hat keine Klammern — der Parser sieht „kein Objekt".
    tipps.push(
      "Vermutlich wurde nur eine Tabelle (ein Array) kopiert. Gebraucht wird das ganze Objekt mit den neun Typ-Schlüsseln.",
    );
    probleme.push(
      "Die Ausgabe war kein Objekt. Gib GENAU EIN Objekt mit allen neun Schlüsseln (coils, switches, lamps, fuses, parts, rules, screws, rubbers, electronics) aus.",
    );
  } else if (hat("Kein JSON-Objekt gefunden") && siehtAbgeschnittenAus(raw)) {
    // Geöffnet, nie geschlossen: der Parser findet kein Objekt, gemeint ist
    // aber ein Abbruch mitten in der Ausgabe.
    tipps.push(ABGESCHNITTEN_TIPP);
    probleme.push(
      "Die Ausgabe war abgeschnitten. Gib das JSON vollständig aus — notfalls in zwei Teilen: Teil 1 mit coils, switches und lamps; Teil 2 mit fuses, parts, rules, screws, rubbers und electronics. Keine Erklärungen, keine Codezäune.",
    );
  } else if (hat("Kein JSON-Objekt gefunden")) {
    tipps.push(
      "Die Antwort enthält kein JSON — das Modell hat vermutlich Fließtext oder eine Tabelle in Prosa geliefert.",
    );
    probleme.push(
      "Die Ausgabe war kein JSON. Gib die Tabellen als GENAU EIN JSON-Objekt aus, wie im Prompt beschrieben — kein Fließtext, kein Markdown.",
    );
  } else if (hat("Kein gültiges JSON")) {
    if (siehtAbgeschnittenAus(raw)) {
      tipps.push(ABGESCHNITTEN_TIPP);
      probleme.push(
        "Die Ausgabe war abgeschnitten. Gib das JSON vollständig aus — notfalls in zwei Teilen: Teil 1 mit coils, switches und lamps; Teil 2 mit fuses, parts, rules, screws, rubbers und electronics. Keine Erklärungen, keine Codezäune.",
      );
    } else {
      tipps.push(
        "Das JSON ist beschädigt (Kommentare, fehlende Kommas, Auslassungspunkte …). Bitte die Ausgabe unverändert und komplett kopieren — nicht von Hand kürzen.",
      );
      probleme.push(
        "Das JSON war syntaktisch ungültig. Gib es erneut aus: gültiges JSON ohne Kommentare, ohne „…“-Auslassungen, alle Zellen als String.",
      );
    }
  } else if (hat("muss ein Objekt")) {
    tipps.push(
      "Vermutlich wurde nur eine Tabelle (ein Array) kopiert. Gebraucht wird das ganze Objekt mit den neun Typ-Schlüsseln.",
    );
    probleme.push(
      "Die Ausgabe war kein Objekt. Gib GENAU EIN Objekt mit allen neun Schlüsseln (coils, switches, lamps, fuses, parts, rules, screws, rubbers, electronics) aus.",
    );
  } else if (hat("kein Array") || hat("kein Objekt") || hat("Zeile ist kein Array")) {
    tipps.push(
      "Eine Tabelle hat die falsche Form. Jede Tabelle ist ein Objekt {\"columns\": [...], \"rows\": [[...], ...]} — Zeilen sind Arrays von Strings.",
    );
    probleme.push(
      "Mindestens eine Tabelle hatte die falsche Form. Jede Tabelle ist {\"columns\":[...],\"rows\":[[...],...]}; jede Zeile ein Array von Strings.",
    );
  } else if (hat("Keine Tabellen mit Zeilen")) {
    tipps.push(
      "Das Modell hat keine Tabellen gefunden. War das Handbuch wirklich angehängt? Gescannte PDFs brauchen ein Modell, das Bilder liest (OCR) — und kostenlose Konten laden oft gar kein PDF hoch.",
    );
    probleme.push(
      "Alle Tabellen waren leer. Das angehängte Handbuch enthält Referenztabellen (Spulen, Schalter-Matrix, Lampen, Sicherungen …) — lies sie aus und fülle die rows. Falls du das PDF nicht lesen kannst, sag es, statt leere Tabellen auszugeben.",
    );
  }

  if (r.ok) {
    const fehlend = KERN.filter((t) => !r.present.includes(t));
    if (r.present.length <= 2 && fehlend.length > 0) {
      const namen = fehlend.map((t) => LABEL[t]).join(", ");
      tipps.push(
        `Nur ${r.present.map((t) => LABEL[t]).join(", ")} gefunden — Handbücher haben meist auch ${namen}. Eine Nachfrage holt sie oft nach.`,
      );
      probleme.push(
        `Es fehlten Tabellen. Ergänze ${namen} (Schlüssel ${fehlend.join(", ")}), sofern im Handbuch vorhanden.`,
      );
    }
    for (const rep of r.reports) {
      if (!rep.columnsOk) {
        probleme.push(
          `${LABEL[rep.typ]}: Verwende exakt diese Spalten in dieser Reihenfolge: ${JSON.stringify(FACT_COLUMNS[rep.typ])}.`,
        );
      }
      if (rep.matrix === false) {
        probleme.push(
          `${LABEL[rep.typ]}: Gib je Eintrag Column und Row als Rasterposition 1–9 an.`,
        );
      }
    }
    if (r.warnings.some((w) => w.includes("zu kurze Zeilen"))) {
      probleme.push(
        "Einige Zeilen hatten zu wenige Zellen. Jede Zeile hat genau so viele Zellen wie columns; fehlende Werte als \"\".",
      );
    }
    if (probleme.length > 0 && tipps.length === 0) {
      tipps.push(
        "Der Import geht so — die Nachfrage unten holt aber sauberere Daten (Spalten, Matrix-Positionen, Zeilenlängen).",
      );
    }
  }

  return {
    tipps,
    nachfrage: nachfrageAus(
      probleme,
      "Gib jetzt bitte das komplette JSON erneut aus — GENAU EIN Objekt mit allen neun Schlüsseln, nur das JSON, keine Erklärung, keine Codezäune.",
    ),
  };
}

export function tippsFuerGuide(raw: string, r: GuideImportResult): ImportTipps {
  const tipps: string[] = [];
  const probleme: string[] = [];
  if (raw.trim() === "") return { tipps: [], nachfrage: null };
  const hat = (teil: string) => r.errors.some((e) => e.includes(teil));

  const abgebrochen = siehtAbgeschnittenAus(raw);
  if ((hat("Kein JSON-Objekt gefunden") || hat("Kein gültiges JSON")) && abgebrochen) {
    tipps.push(
      `${ABGESCHNITTEN_TIPP} Ein Guide ist lang — kostenlose Konten brechen hier fast immer ab.`,
    );
    probleme.push(
      "Die Ausgabe war abgeschnitten. Gib das JSON vollständig aus; wenn die Antwort zu lang wird, fasse die Blöcke kürzer, statt abzubrechen — oder gib erst die Abschnitte 1–4, dann 5–7 samt quellen, jeweils als eigenes JSON.",
    );
  } else if (hat("Kein JSON-Objekt gefunden")) {
    tipps.push(
      "Die Antwort enthält kein JSON — das Modell hat den Guide vermutlich als Fließtext geschrieben. Inhaltlich vielleicht gut, aber so nicht importierbar.",
    );
    probleme.push(
      "Die Ausgabe war kein JSON. Gib denselben Guide als JSON in der vorgegebenen Form aus (plattform, abschnitte mit bloecke, quellen) — kein Fließtext, kein Markdown.",
    );
  } else if (hat("Kein gültiges JSON")) {
    tipps.push(
      "Das JSON ist beschädigt (Kommentare, fehlende Kommas, Auslassungspunkte …). Bitte die Ausgabe unverändert und komplett kopieren.",
    );
    probleme.push(
      "Das JSON war syntaktisch ungültig. Gib es erneut aus: gültiges JSON ohne Kommentare und ohne „…“-Auslassungen.",
    );
  } else if (hat("passt nicht zur Guide-Struktur")) {
    tipps.push(
      "Die Struktur weicht ab (der Fehler nennt die Stelle). Meist hat das Modell eigene Schlüssel erfunden oder Abschnitte als Text statt als Blöcke geliefert.",
    );
    probleme.push(
      "Die Struktur passte nicht. Halte dich EXAKT an die JSON-Form aus dem Prompt: gleiche Schlüssel, gleiche Verschachtelung (plattform, abschnitte[{titel, bloecke[{typ, …}]}], quellen) — keine zusätzlichen oder umbenannten Schlüssel.",
    );
  } else if (hat("keine Abschnitte")) {
    probleme.push(
      "abschnitte war leer. Fülle alle sieben Abschnitte (Sicherheit bis Werkzeug/Ersatzteile) mit Blöcken.",
    );
  }

  if (r.ok) {
    if (r.abschnitte < 7) {
      probleme.push(
        `Der Guide hatte nur ${r.abschnitte} Abschnitte. Ergänze die fehlenden, bis alle sieben (Sicherheit bis Werkzeug/Ersatzteile) enthalten sind.`,
      );
    }
    if (r.warnings.some((w) => w.includes("ohne Inhalt"))) {
      probleme.push("Einige Abschnitte hatten keine Blöcke. Fülle jeden Abschnitt mit mindestens einem Block.");
    }
    if (r.quellen === 0) {
      tipps.push(
        "Keine Quellen — im Chat die Websuche einschalten (Claude: Websuche, ChatGPT: Browsing), sonst kann das Modell Serienfehler nicht belegen.",
      );
      probleme.push(
        "quellen war leer. Verifiziere Plattform und Serienfehler per Websuche (IPDB, PinWiki, Pinside) und nenne die Fundstellen in quellen.",
      );
    }
    if (!r.plattform.trim()) {
      probleme.push("plattform fehlte. Setze die erkannte Plattform bzw. Geräte-Generation (Schritt 0 des Prompts).");
    }
    if (probleme.length > 0 && tipps.length === 0) {
      tipps.push(
        "Der Import geht so — die Nachfrage unten macht den Guide vollständiger (Abschnitte, Quellen, Plattform).",
      );
    }
  }

  return {
    tipps,
    nachfrage: nachfrageAus(
      probleme,
      "Gib jetzt bitte den kompletten Guide erneut als JSON aus — nur das JSON, keine Erklärung, keine Codezäune.",
    ),
  };
}

/** Für Tests und die Anzeige: alle Typ-Schlüssel in kanonischer Reihenfolge. */
export const FAKTEN_TYPEN = FACT_TYPES;
