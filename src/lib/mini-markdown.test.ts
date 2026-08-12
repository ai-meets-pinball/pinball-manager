import { describe, expect, it } from "vitest";
import { sichereUrl } from "@/lib/sichere-url";
import { parseMarkdown } from "@/lib/mini-markdown";
import { baueLinks, leseTippInhalt } from "@/lib/tipp-inhalt";

describe("sichereUrl", () => {
  it("akzeptiert http/https und normalisiert", () => {
    expect(sichereUrl("https://example.com")).toBe("https://example.com/");
    expect(sichereUrl("http://a.de/x")).toBe("http://a.de/x");
  });
  it("ergänzt fehlendes Schema mit https", () => {
    expect(sichereUrl("example.com")).toBe("https://example.com/");
  });
  it("erlaubt mailto", () => {
    expect(sichereUrl("mailto:a@b.de")).toBe("mailto:a@b.de");
  });
  it("verwirft gefährliche Protokolle und Leeres", () => {
    expect(sichereUrl("javascript:alert(1)")).toBeNull();
    expect(sichereUrl("data:text/html,x")).toBeNull();
    expect(sichereUrl("   ")).toBeNull();
  });
});

describe("parseMarkdown", () => {
  it("trennt Absätze an Leerzeilen", () => {
    const b = parseMarkdown("Zeile eins\n\nZeile zwei");
    expect(b).toHaveLength(2);
    expect(b[0]).toEqual({
      t: "absatz",
      inhalt: [{ t: "text", wert: "Zeile eins" }],
    });
  });

  it("erkennt fett und kursiv", () => {
    const [absatz] = parseMarkdown("**a** und _b_ und *c*");
    expect(absatz.t).toBe("absatz");
    if (absatz.t !== "absatz") return;
    const typen = absatz.inhalt.map((n) => n.t);
    expect(typen).toContain("fett");
    expect(typen.filter((t) => t === "kursiv")).toHaveLength(2);
  });

  it("baut eine Liste aus zusammenhängenden -/* Zeilen", () => {
    const b = parseMarkdown("- eins\n- zwei\n* drei");
    expect(b).toHaveLength(1);
    expect(b[0].t).toBe("liste");
    if (b[0].t === "liste") expect(b[0].punkte).toHaveLength(3);
  });

  it("macht Markdown-Links und nackte URLs anklickbar, verwirft javascript:", () => {
    const [a] = parseMarkdown(
      "siehe [hier](https://ex.de/p) und https://foo.de",
    );
    if (a.t !== "absatz") throw new Error("Absatz erwartet");
    const links = a.inhalt.filter((n) => n.t === "link");
    expect(links).toHaveLength(2);

    const [b] = parseMarkdown("[x](javascript:alert(1))");
    if (b.t !== "absatz") throw new Error("Absatz erwartet");
    expect(b.inhalt.some((n) => n.t === "link")).toBe(false);
  });

  it("reißt Satzendezeichen nicht in die URL", () => {
    const [a] = parseMarkdown("Link: https://foo.de/x.");
    if (a.t !== "absatz") throw new Error("Absatz erwartet");
    const link = a.inhalt.find((n) => n.t === "link");
    expect(link && link.t === "link" && link.href).toBe("https://foo.de/x");
  });
});

describe("tipp-inhalt", () => {
  it("liest alten Text-only-Inhalt und liefert leere Links", () => {
    expect(leseTippInhalt({ text: "hallo" })).toEqual({
      text: "hallo",
      links: [],
    });
    expect(leseTippInhalt(null)).toEqual({ text: "", links: [] });
  });

  it("liest Links und ignoriert kaputte Einträge", () => {
    const r = leseTippInhalt({
      text: "t",
      links: [
        { url: "https://a.de", name: "A" },
        { name: "kein url" },
        "murks",
      ],
    });
    expect(r.links).toEqual([{ url: "https://a.de", name: "A" }]);
  });

  it("baueLinks filtert unsichere/leere URLs und trimmt Felder", () => {
    const r = baueLinks(
      ["example.com", "javascript:x", ""],
      [" Name ", "n", ""],
      ["", "", ""],
    );
    expect(r).toEqual([{ url: "https://example.com/", name: "Name" }]);
  });
});
