import { sichereUrl } from "@/lib/sichere-url";

/*
  Form des Tipp-Inhalts (JSON-Spalte `knowledge.inhalt` bei typ='tipp'):
  freier Text plus optional eine Liste weiterführender Links. Rückwärts-
  kompatibel — alte Tipps haben nur `{ text }`. Reine Helfer (kein I/O), damit
  Lesen/Schreiben an EINER Stelle definiert und testbar ist.
*/
export type TippLink = { url: string; name?: string; beschreibung?: string };
export type TippInhalt = { text: string; links: TippLink[] };

/** Rohes `inhalt` (unbekannter Herkunft) tolerant in Text + Links lesen. */
export function leseTippInhalt(inhalt: unknown): TippInhalt {
  const obj =
    inhalt && typeof inhalt === "object"
      ? (inhalt as Record<string, unknown>)
      : {};
  const text = typeof obj.text === "string" ? obj.text : "";
  const rohLinks = Array.isArray(obj.links) ? obj.links : [];
  const links: TippLink[] = [];
  for (const l of rohLinks) {
    if (!l || typeof l !== "object") continue;
    const url = (l as Record<string, unknown>).url;
    if (typeof url !== "string" || !url) continue;
    const name = (l as Record<string, unknown>).name;
    const beschreibung = (l as Record<string, unknown>).beschreibung;
    links.push({
      url,
      ...(typeof name === "string" && name ? { name } : {}),
      ...(typeof beschreibung === "string" && beschreibung
        ? { beschreibung }
        : {}),
    });
  }
  return { text, links };
}

/** Aus parallelen Formular-Arrays (index-gleich) gültige Links bauen: Zeilen
    ohne sichere URL fallen weg; leere Name/Beschreibung werden weggelassen. */
export function baueLinks(
  urls: string[],
  namen: string[],
  beschreibungen: string[],
): TippLink[] {
  const links: TippLink[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = sichereUrl(urls[i] ?? "");
    if (!url) continue;
    const name = (namen[i] ?? "").trim();
    const beschreibung = (beschreibungen[i] ?? "").trim();
    links.push({
      url,
      ...(name ? { name } : {}),
      ...(beschreibung ? { beschreibung } : {}),
    });
  }
  return links;
}
