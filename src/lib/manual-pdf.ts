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

// Leicht kleiner als die Web-Anzeige (Frank, 2026-09-13): 10 pt Fließtext
// liest sich auf A4 gut und spart je Kapitel eine Seite.
const GROESSE = {
  titel: 28,
  untertitel: 13,
  kapitel: 15,
  einleitung: 10,
  text: 10,
  fusszeile: 9,
};
const ZEILE = 1.4; // Zeilenabstand als Faktor der Schriftgröße

const FARBE = {
  text: rgb(0.15, 0.15, 0.17),
  gedaempft: rgb(0.45, 0.45, 0.5),
  blass: rgb(0.78, 0.77, 0.75), // wie --color-faint
  akzent: rgb(0.45, 0.11, 0.18), // Burgund, wie --color-primary
};

/** Pfad eines abgerundeten Rechtecks (SVG-Koordinaten, y nach unten). */
function rundRect(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x + r},${y}`,
    `H ${x + w - r}`,
    `A ${r},${r} 0 0 1 ${x + w},${y + r}`,
    `V ${y + h - r}`,
    `A ${r},${r} 0 0 1 ${x + w - r},${y + h}`,
    `H ${x + r}`,
    `A ${r},${r} 0 0 1 ${x},${y + h - r}`,
    `V ${y + r}`,
    `A ${r},${r} 0 0 1 ${x + r},${y}`,
    "Z",
  ].join(" ");
}

/**
 * Die Wort-Bild-Marke aus components/logo.tsx, als Vektor nachgezeichnet
 * (dieselben Formen im 76×90-Raster: Gehäuse-Umriss, Backglass-Balken, blasse
 * Linie, Bordeaux-Akzent) — kein Bild-Asset nötig, scharf in jeder Größe.
 * `x`/`yOben` = linke obere Ecke in PDF-Koordinaten, `hoehe` in pt.
 */
function zeichneLogo(seite: PDFPage, x: number, yOben: number, hoehe: number) {
  const k = hoehe / 90;
  const basis = { x, y: yOben, scale: k };
  seite.drawSvgPath(rundRect(3, 3, 70, 84, 8), {
    ...basis,
    borderColor: FARBE.text,
    borderWidth: 4 * k,
  });
  seite.drawSvgPath(rundRect(15, 19, 46, 8, 2), { ...basis, color: FARBE.text });
  seite.drawSvgPath(rundRect(15, 60, 46, 4, 1), { ...basis, color: FARBE.blass });
  seite.drawSvgPath(rundRect(15, 71, 26, 4, 1), { ...basis, color: FARBE.akzent });
}

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

  // ── Titelseite: Wort-Bild-Marke oben links wie in der Kopfzeile ──
  const logoHoehe = 30;
  zeichneLogo(c.seite, RAND, A4.hoehe - RAND, logoHoehe);
  const markeX = RAND + logoHoehe * (76 / 90) + 8;
  const markeY = A4.hoehe - RAND - logoHoehe / 2 - 6;
  c.seite.drawText("pinball", { x: markeX, y: markeY, size: 17, font: fett, color: FARBE.text });
  c.seite.drawText("-manager", {
    x: markeX + fett.widthOfTextAtSize("pinball", 17),
    y: markeY,
    size: 17,
    font: fett,
    color: FARBE.akzent,
  });

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
    // Jedes Kapitel beginnt auf einer neuen Seite (Frank, 2026-09-13) — das
    // erste damit auf der Seite nach dem Titel (das Inhaltsverzeichnis rückt
    // später als Seite 2 dazwischen).
    c.neueSeite();
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
