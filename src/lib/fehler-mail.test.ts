import { describe, expect, it } from "vitest";
import { MAIL_SPERRE_MINUTEN, sollEigentuemerMailen } from "@/lib/fehler-mail";

const jetzt = new Date("2026-09-23T12:00:00Z");
const vorMinuten = (n: number) => new Date(jetzt.getTime() - n * 60_000);

const privat = {
  clubId: null,
  ownerId: "owner",
  melderId: null,
  fruehereFremdMeldungen: [] as Date[],
};

describe("sollEigentuemerMailen", () => {
  it("mailt bei der ersten Gast-Meldung an einer privaten Maschine", () => {
    expect(sollEigentuemerMailen(privat, jetzt)).toBe(true);
  });

  it("mailt auch, wenn ein anderer angemeldeter Nutzer meldet", () => {
    expect(sollEigentuemerMailen({ ...privat, melderId: "gast-user" }, jetzt)).toBe(true);
  });

  it("schweigt bei Club-Maschinen (dort läuft WhatsApp)", () => {
    expect(sollEigentuemerMailen({ ...privat, clubId: "club" }, jetzt)).toBe(false);
  });

  it("schweigt, wenn der Eigentümer selbst meldet", () => {
    expect(sollEigentuemerMailen({ ...privat, melderId: "owner" }, jetzt)).toBe(false);
  });

  it("schweigt, solange die Sperre nach einer Fremd-Meldung läuft", () => {
    expect(
      sollEigentuemerMailen(
        { ...privat, fruehereFremdMeldungen: [vorMinuten(MAIL_SPERRE_MINUTEN - 1)] },
        jetzt,
      ),
    ).toBe(false);
  });

  it("mailt wieder, wenn die letzte Fremd-Meldung älter als die Sperre ist", () => {
    expect(
      sollEigentuemerMailen(
        {
          ...privat,
          fruehereFremdMeldungen: [vorMinuten(MAIL_SPERRE_MINUTEN + 1), vorMinuten(600)],
        },
        jetzt,
      ),
    ).toBe(true);
  });
});
