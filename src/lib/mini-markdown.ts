import { sichereUrl } from "@/lib/sichere-url";

/*
  Winziger, bewusst begrenzter Markdown-Parser für Tipp-Texte. Keine externe
  Bibliothek und kein HTML: die Quelle wird in einen kleinen AST zerlegt, den
  der Renderer (components/ui/formatted-text.tsx) als React-Elemente ausgibt —
  dadurch ist XSS strukturell ausgeschlossen (kein dangerouslySetInnerHTML).

  Unterstützt wird eine „Basis"-Formatierung:
    **fett**            → fett
    _kursiv_ / *kursiv* → kursiv
    - Punkt / * Punkt   → Aufzählung (zusammenhängende Zeilen = eine Liste)
    [Text](https://…)   → Link (nur sichere Protokolle, sonst als Text)
    https://…           → nackte URL wird automatisch anklickbar
    Leerzeile           → neuer Absatz; einzelner Umbruch bleibt im Absatz
*/
export type Inline =
  | { t: "text"; wert: string }
  | { t: "fett"; kinder: Inline[] }
  | { t: "kursiv"; kinder: Inline[] }
  | { t: "link"; href: string; kinder: Inline[] };

export type Block =
  { t: "absatz"; inhalt: Inline[] } | { t: "liste"; punkte: Inline[][] };

export function parseMarkdown(quelle: string): Block[] {
  const zeilen = quelle.replace(/\r\n?/g, "\n").split("\n");
  const bloecke: Block[] = [];
  let absatz: string[] = [];
  let liste: string[] = [];

  const flushAbsatz = () => {
    if (absatz.length) {
      bloecke.push({ t: "absatz", inhalt: parseInline(absatz.join("\n")) });
      absatz = [];
    }
  };
  const flushListe = () => {
    if (liste.length) {
      bloecke.push({ t: "liste", punkte: liste.map((z) => parseInline(z)) });
      liste = [];
    }
  };

  for (const zeile of zeilen) {
    const punkt = /^\s*[-*]\s+(.*)$/.exec(zeile);
    if (punkt) {
      flushAbsatz();
      liste.push(punkt[1]);
    } else if (zeile.trim() === "") {
      flushAbsatz();
      flushListe();
    } else {
      flushListe();
      absatz.push(zeile);
    }
  }
  flushAbsatz();
  flushListe();
  return bloecke;
}

/* Inline-Zerlegung: von links nach rechts, bekannte Muster zuerst; alles andere
   sammelt sich als Text. Verschachtelung (z. B. fett + Link) über Rekursion auf
   dem jeweils kürzeren Innentext → keine Endlosschleife. */
function parseInline(text: string): Inline[] {
  const nodes: Inline[] = [];
  let puffer = "";
  let i = 0;
  const flush = () => {
    if (puffer) {
      nodes.push({ t: "text", wert: puffer });
      puffer = "";
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    let m = /^\*\*([^]+?)\*\*/.exec(rest);
    if (m) {
      flush();
      nodes.push({ t: "fett", kinder: parseInline(m[1]) });
      i += m[0].length;
      continue;
    }
    m = /^_([^_]+?)_/.exec(rest);
    if (m) {
      flush();
      nodes.push({ t: "kursiv", kinder: parseInline(m[1]) });
      i += m[0].length;
      continue;
    }
    m = /^\*([^*\s][^*]*?)\*/.exec(rest);
    if (m) {
      flush();
      nodes.push({ t: "kursiv", kinder: parseInline(m[1]) });
      i += m[0].length;
      continue;
    }
    m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (m) {
      const href = sichereUrl(m[2]);
      if (href) {
        flush();
        nodes.push({ t: "link", href, kinder: parseInline(m[1]) });
        i += m[0].length;
        continue;
      }
    }
    // Nackte URL — endende Satzzeichen (. , ; : ! ? )) nicht mitreißen.
    m = /^(https?:\/\/[^\s<]*[^\s<.,;:!?)])/.exec(rest);
    if (m) {
      const href = sichereUrl(m[1]);
      if (href) {
        flush();
        nodes.push({ t: "link", href, kinder: [{ t: "text", wert: m[1] }] });
        i += m[0].length;
        continue;
      }
    }

    puffer += text[i];
    i += 1;
  }
  flush();
  return nodes;
}
