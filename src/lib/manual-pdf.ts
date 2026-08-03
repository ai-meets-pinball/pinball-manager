import {
  PDFDocument,
  PDFFont,
  PDFName,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { HilfeSektion } from "@/lib/help-content";

/*
  Handbuch-Generator: baut aus dem Hilfe-Inhalt (lib/help-content.ts) ein
  echtes PDF — heruntergeladen über die Route /help/manual. Bewusst eine
  KLEINE, lesbare Layout-Engine auf pdf-lib (das ohnehin für das Handbuch-
  Splitting an Bord ist) statt einer HTML-zu-PDF-Abhängigkeit: A4, Helvetica,
  Wortumbruch per Textbreiten-Messung, Seitenumbruch, Fußzeilen.

  Grenze der Standard-Schriften: WinAnsi-Zeichensatz. Umlaute, ß und die
  typografischen Zeichen der Hilfe („ " » « – — ·) sind enthalten; exotische
  Glyphen (Pfeile, Haken) ersetzt `bereinige` durch ASCII-Äquivalente.
*/

const A4 = { breite: 595.28, hoehe: 841.89 };
const RAND = 56;
const TEXTBREITE = A4.breite - 2 * RAND;
const FUSSZONE = RAND * 0.6; // unterhalb davon nur die Fußzeile

const GROESSE = {
  titel: 28,
  untertitel: 14,
  kapitel: 16,
  einleitung: 11,
  text: 11,
  fusszeile: 9,
};
const ZEILE = 1.4; // Zeilenabstand als Faktor der Schriftgröße

const FARBE = {
  text: rgb(0.15, 0.15, 0.17),
  gedaempft: rgb(0.45, 0.45, 0.5),
  akzent: rgb(0.45, 0.11, 0.18), // Burgund, wie --color-primary
};

/** Nicht-WinAnsi-Glyphen auf ASCII-Äquivalente abbilden, Rest verwerfen. */
function bereinige(text: string): string {
  const ersatz: Record<string, string> = {
    "→": "->",
    "←": "<-",
    "⇆": "<->",
    "✓": "-",
    " ": " ",
  };
  return Array.from(text)
    .map((z) => {
      if (ersatz[z] !== undefined) return ersatz[z];
      // WinAnsi deckt Latin-1 plus u. a. „ " » « – — … · € ab.
      if (z.charCodeAt(0) <= 0xff || "„“”‚‘’»«–—…·€".includes(z)) return z;
      return "?";
    })
    .join("");
}

/** Greedy-Wortumbruch: füllt Zeilen anhand der gemessenen Textbreite. */
function umbrechen(
  text: string,
  font: PDFFont,
  groesse: number,
  maxBreite: number,
): string[] {
  const zeilen: string[] = [];
  let zeile = "";
  for (const wort of text.split(" ")) {
    const versuch = zeile ? `${zeile} ${wort}` : wort;
    if (font.widthOfTextAtSize(versuch, groesse) <= maxBreite || !zeile) {
      zeile = versuch;
    } else {
      zeilen.push(zeile);
      zeile = wort;
    }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/** Schreib-Cursor: eine Seite + y-Position, mit Umbruch in neue Seiten. */
class Cursor {
  seite: PDFPage;
  y: number;

  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private fett: PDFFont,
  ) {
    this.seite = doc.addPage([A4.breite, A4.hoehe]);
    this.y = A4.hoehe - RAND;
  }

  neueSeite() {
    this.seite = this.doc.addPage([A4.breite, A4.hoehe]);
    this.y = A4.hoehe - RAND;
  }

  brauchePlatz(hoehe: number) {
    if (this.y - hoehe < RAND + FUSSZONE) this.neueSeite();
  }

  /** Einen (umbrochenen) Absatz schreiben; `einzug` rückt Folgezeilen ein. */
  absatz(
    text: string,
    opts: {
      fett?: boolean;
      groesse?: number;
      farbe?: ReturnType<typeof rgb>;
      einzugErsteZeile?: number;
      einzug?: number;
      abstandDanach?: number;
    } = {},
  ) {
    const font = opts.fett ? this.fett : this.normal;
    const groesse = opts.groesse ?? GROESSE.text;
    const farbe = opts.farbe ?? FARBE.text;
    const einzug = opts.einzug ?? 0;
    const ersteZeileEinzug = opts.einzugErsteZeile ?? einzug;

    const zeilen = umbrechen(
      bereinige(text),
      font,
      groesse,
      TEXTBREITE - einzug,
    );
    for (const [i, zeile] of zeilen.entries()) {
      this.brauchePlatz(groesse * ZEILE);
      this.seite.drawText(zeile, {
        x: RAND + (i === 0 ? ersteZeileEinzug : einzug),
        y: this.y - groesse,
        size: groesse,
        font,
        color: farbe,
      });
      this.y -= groesse * ZEILE;
    }
    this.y -= opts.abstandDanach ?? 0;
  }
}

export async function erzeugeHandbuchPdf(optionen: {
  kapitel: HilfeSektion[];
  version: string;
  /** Vermerk auf der Titelseite, wenn die Admin-Kapitel enthalten sind. */
  mitAdminKapiteln: boolean;
}): Promise<Uint8Array> {
  const { kapitel, version, mitAdminKapiteln } = optionen;

  const doc = await PDFDocument.create();
  doc.setTitle("Pinball Manager — Benutzerhandbuch");
  doc.setLanguage("de-DE");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const fett = await doc.embedFont(StandardFonts.HelveticaBold);
  const c = new Cursor(doc, normal, fett);

  // ── Titelseite ──
  c.y -= 180;
  c.absatz("Pinball Manager", { fett: true, groesse: GROESSE.titel, farbe: FARBE.akzent });
  c.y -= 8;
  c.absatz("Benutzerhandbuch", { groesse: GROESSE.untertitel + 4 });
  c.y -= 24;
  c.absatz(`Version ${version}`, { groesse: GROESSE.untertitel, farbe: FARBE.gedaempft });
  c.absatz(
    `Stand: ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}`,
    { groesse: GROESSE.untertitel, farbe: FARBE.gedaempft },
  );
  if (mitAdminKapiteln) {
    c.y -= 12;
    c.absatz("Ausgabe inkl. Administrations-Kapitel", {
      groesse: GROESSE.untertitel,
      farbe: FARBE.gedaempft,
    });
  }

  // ── Kapitel (zuerst — das Inhaltsverzeichnis braucht die Zielpositionen) ──
  const kapitelStarts: { titel: string; seite: PDFPage; y: number }[] = [];
  for (const [i, k] of kapitel.entries()) {
    // Überschrift + Einleitung zusammenhalten (kein Umbruch direkt danach).
    c.brauchePlatz(GROESSE.kapitel * ZEILE * 4);
    c.y -= 14;
    kapitelStarts.push({ titel: k.titel, seite: c.seite, y: c.y });
    c.absatz(`${i + 1} · ${k.titel}`, {
      fett: true,
      groesse: GROESSE.kapitel,
      farbe: FARBE.akzent,
      abstandDanach: 2,
    });
    c.absatz(k.einleitung, {
      groesse: GROESSE.einleitung,
      farbe: FARBE.gedaempft,
      abstandDanach: 8,
    });

    for (const [j, schritt] of k.schritte.entries()) {
      c.brauchePlatz(GROESSE.text * ZEILE * 2);
      if (schritt.titel) {
        c.absatz(`${j + 1}. ${schritt.titel}`, { fett: true, abstandDanach: 1 });
        c.absatz(schritt.text, { einzug: 16, abstandDanach: 7 });
      } else {
        // Ohne Titel: Nummer und Text in einer Zeile, hängender Einzug.
        c.absatz(`${j + 1}. ${schritt.text}`, {
          einzug: 16,
          einzugErsteZeile: 0,
          abstandDanach: 7,
        });
      }
    }
  }

  // ── Inhaltsverzeichnis: als Seite 2 EINGEFÜGT, jede Zeile ein klickbares
  //    Sprungziel (Link-Annotation) samt echter Seitenzahl. Passt bei der
  //    aktuellen Kapitelzahl bequem auf eine Seite. ──
  const toc = doc.insertPage(1, [A4.breite, A4.hoehe]);
  let tocY = A4.hoehe - RAND - GROESSE.kapitel;
  toc.drawText("Inhalt", {
    x: RAND,
    y: tocY,
    size: GROESSE.kapitel,
    font: fett,
    color: FARBE.akzent,
  });
  tocY -= GROESSE.kapitel * ZEILE;

  const seitenNachEinfuegen = doc.getPages();
  const linkRefs = [];
  for (const [i, start] of kapitelStarts.entries()) {
    const zeilenHoehe = GROESSE.text * ZEILE;
    tocY -= zeilenHoehe;
    const seitenNr = seitenNachEinfuegen.indexOf(start.seite) + 1;
    const eintrag = bereinige(`${i + 1}  ${start.titel}`);
    toc.drawText(eintrag, {
      x: RAND,
      y: tocY,
      size: GROESSE.text,
      font: normal,
      color: FARBE.text,
    });
    const nrText = String(seitenNr);
    toc.drawText(nrText, {
      x: A4.breite - RAND - normal.widthOfTextAtSize(nrText, GROESSE.text),
      y: tocY,
      size: GROESSE.text,
      font: normal,
      color: FARBE.gedaempft,
    });
    // Klickfläche über die ganze Zeile; Ziel = Kapitelanfang (XYZ = Position).
    linkRefs.push(
      doc.context.register(
        doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [RAND, tocY - 2, A4.breite - RAND, tocY + GROESSE.text + 2],
          Border: [0, 0, 0],
          Dest: [start.seite.ref, "XYZ", null, start.y, null],
        }),
      ),
    );
  }
  toc.node.set(PDFName.of("Annots"), doc.context.obj(linkRefs));

  // ── Fußzeilen (Titelseite ausgenommen) ──
  const seiten = doc.getPages();
  for (const [i, seite] of seiten.entries()) {
    if (i === 0) continue;
    const text = `Pinball Manager · Benutzerhandbuch — Seite ${i + 1} von ${seiten.length}`;
    const breite = normal.widthOfTextAtSize(text, GROESSE.fusszeile);
    seite.drawText(text, {
      x: (A4.breite - breite) / 2,
      y: RAND / 2,
      size: GROESSE.fusszeile,
      font: normal,
      color: FARBE.gedaempft,
    });
  }

  return doc.save();
}
