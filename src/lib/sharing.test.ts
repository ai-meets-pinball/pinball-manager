import { describe, expect, it } from "vitest";
import {
  emailsAusText,
  freigabeUnveraendert,
  freigabeZielFehlt,
  type FreigabeEntwurf,
} from "./sharing";

const basis: FreigabeEntwurf = {
  scope: "platform",
  anonym: true,
  zeigeKosten: false,
  clubIds: [],
  emails: [],
};

describe("emailsAusText", () => {
  it("trennt an Kommas, trimmt, normalisiert klein und lässt Leeres weg", () => {
    expect(emailsAusText(" Anna@Example.com ,, bob@x.de,")).toEqual([
      "anna@example.com",
      "bob@x.de",
    ]);
  });
  it("leer bleibt leer", () => {
    expect(emailsAusText("")).toEqual([]);
    expect(emailsAusText(" , ")).toEqual([]);
  });
});

describe("freigabeZielFehlt", () => {
  it("Plattform braucht kein Ziel", () => {
    expect(freigabeZielFehlt({ scope: "platform", clubIds: [], emails: [] })).toBeNull();
  });
  it("Club ohne Club ist gesperrt, mit Club frei", () => {
    expect(freigabeZielFehlt({ scope: "club", clubIds: [], emails: ["a@b.de"] })).toMatch(
      /Club/,
    );
    expect(freigabeZielFehlt({ scope: "club", clubIds: ["c1"], emails: [] })).toBeNull();
  });
  it("Personen ohne E-Mail ist gesperrt, mit E-Mail frei", () => {
    expect(freigabeZielFehlt({ scope: "users", clubIds: ["c1"], emails: [] })).toMatch(
      /E-Mail/,
    );
    expect(freigabeZielFehlt({ scope: "users", clubIds: [], emails: ["a@b.de"] })).toBeNull();
  });
});

describe("freigabeUnveraendert", () => {
  it("identischer Entwurf ist unverändert", () => {
    expect(freigabeUnveraendert(basis, { ...basis })).toBe(true);
  });
  it("Reichweite, anonym oder Kosten geändert → verändert", () => {
    expect(freigabeUnveraendert(basis, { ...basis, scope: "club" })).toBe(false);
    expect(freigabeUnveraendert(basis, { ...basis, anonym: false })).toBe(false);
    expect(freigabeUnveraendert(basis, { ...basis, zeigeKosten: true })).toBe(false);
  });
  it("Club-Ziele: Reihenfolge egal, Menge zählt", () => {
    const a = { ...basis, scope: "club" as const, clubIds: ["c1", "c2"] };
    expect(freigabeUnveraendert(a, { ...a, clubIds: ["c2", "c1"] })).toBe(true);
    expect(freigabeUnveraendert(a, { ...a, clubIds: ["c1"] })).toBe(false);
    expect(freigabeUnveraendert(a, { ...a, clubIds: ["c1", "c2", "c3"] })).toBe(false);
  });
  it("Personen-Ziele werden verglichen, Club-Reste bei Plattform ignoriert", () => {
    const u = { ...basis, scope: "users" as const, emails: ["a@b.de"] };
    expect(freigabeUnveraendert(u, { ...u, emails: ["c@d.de"] })).toBe(false);
    expect(freigabeUnveraendert(u, { ...u, emails: ["a@b.de"] })).toBe(true);
    // Bei „Plattform" zählen liegen gebliebene Club-Chips nicht als Änderung.
    expect(freigabeUnveraendert(basis, { ...basis, clubIds: ["c1"] })).toBe(true);
  });
});
