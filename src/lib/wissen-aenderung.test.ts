import { describe, expect, it } from "vitest";
import { wissenUnveraendert, type WissenStand } from "@/lib/wissen-aenderung";

const stand: WissenStand = {
  titel: "Spulen",
  inhalt: '{"coils":{}}',
  links: [{ url: "https://a.example", name: "A" }],
};

describe("wissenUnveraendert", () => {
  it("erkennt den identischen Stand", () => {
    expect(wissenUnveraendert(stand, { ...stand })).toBe(true);
  });

  it("ignoriert Leerraum am Titelrand und leere Link-Felder", () => {
    expect(
      wissenUnveraendert(stand, {
        ...stand,
        titel: "  Spulen ",
        links: [{ url: "https://a.example", name: "A", beschreibung: "" }],
      }),
    ).toBe(true);
  });

  it("sieht Titel-, Inhalts- und Link-Änderungen", () => {
    expect(wissenUnveraendert(stand, { ...stand, titel: "Spulen 2" })).toBe(false);
    expect(wissenUnveraendert(stand, { ...stand, inhalt: "{}" })).toBe(false);
    expect(
      wissenUnveraendert(stand, {
        ...stand,
        links: [{ url: "https://a.example", name: "B" }],
      }),
    ).toBe(false);
    expect(wissenUnveraendert(stand, { ...stand, links: [] })).toBe(false);
  });

  it("kommt mit leeren Ständen zurecht", () => {
    const leer = { titel: "", inhalt: "", links: [] };
    expect(wissenUnveraendert(leer, leer)).toBe(true);
    expect(wissenUnveraendert(leer, { ...leer, inhalt: "x" })).toBe(false);
  });
});
