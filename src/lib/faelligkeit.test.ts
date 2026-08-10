import { describe, expect, it } from "vitest";
import {
  baldBis,
  faelligBis,
  faelligkeit,
  intervallLabel,
  naechsterTermin,
} from "@/lib/faelligkeit";

/*
  Fälligkeit wird auf TAGE verglichen, nicht auf Zeitstempel — „seit 3 Tagen
  fällig" ergibt sonst keinen Sinn, und ein Termin am heutigen Vormittag wäre
  bis zum Uhrzeit-Sprung noch „bald". Zeitzone ist Europe/Berlin: der Server
  läuft auf Vercel in UTC, die Nutzer stehen in Deutschland an der Maschine.

  Alle Zeitpunkte hier als UTC-ISO, damit der Test unabhängig von der lokalen
  Zeitzone des Entwicklerrechners ist. August = CEST = UTC+2.
*/
const zeit = (iso: string) => new Date(iso);
const punkt = (naechsteFaelligkeit: Date | null, intervallTyp = "zeit") => ({
  intervallTyp,
  naechsteFaelligkeit,
});

describe("faelligkeit", () => {
  const jetzt = zeit("2026-08-10T08:00:00Z"); // 10:00 Berlin

  it("zählt einen Termin von heute Abend als fällig", () => {
    // Der Regressionsfall: 18:00 Berlin liegt zeitlich NACH jetzt, aber am
    // selben Tag. Zeitstempel-Vergleich sagte hier „bald".
    const r = faelligkeit(punkt(zeit("2026-08-10T16:00:00Z")), jetzt);
    expect(r.status).toBe("faellig");
    expect(r.tageBisFaellig).toBe(0);
  });

  it("zählt einen Termin von heute früh als fällig", () => {
    const r = faelligkeit(punkt(zeit("2026-08-10T06:00:00Z")), jetzt);
    expect(r.status).toBe("faellig");
    expect(r.tageBisFaellig).toBe(0);
  });

  it("meldet vergangene Termine mit negativer Tageszahl", () => {
    const r = faelligkeit(punkt(zeit("2026-08-07T16:00:00Z")), jetzt);
    expect(r.status).toBe("faellig");
    expect(r.tageBisFaellig).toBe(-3);
  });

  it("nennt morgen „bald“", () => {
    const r = faelligkeit(punkt(zeit("2026-08-11T16:00:00Z")), jetzt);
    expect(r.status).toBe("bald");
    expect(r.tageBisFaellig).toBe(1);
  });

  it("zieht die Grenze zwischen „bald“ und „ok“ bei 14 Tagen", () => {
    expect(faelligkeit(punkt(zeit("2026-08-24T16:00:00Z")), jetzt).status).toBe(
      "bald",
    );
    expect(faelligkeit(punkt(zeit("2026-08-25T16:00:00Z")), jetzt).status).toBe(
      "ok",
    );
  });

  it("springt erst um Mitternacht Berliner Zeit, nicht um Mitternacht UTC", () => {
    const kurzVorMitternacht = zeit("2026-08-10T21:30:00Z"); // 23:30 Berlin
    const halbEinsBerlin = zeit("2026-08-10T22:30:00Z"); // 00:30 Berlin, Folgetag
    const r = faelligkeit(punkt(halbEinsBerlin), kurzVorMitternacht);
    expect(r.status).toBe("bald");
    expect(r.tageBisFaellig).toBe(1);
  });

  it("gibt Punkten ohne Zeitintervall keinen Termin", () => {
    expect(faelligkeit(punkt(null), jetzt)).toEqual({
      status: "kein-termin",
      tageBisFaellig: null,
    });
    expect(
      faelligkeit(punkt(zeit("2026-08-01T00:00:00Z"), "bedarf"), jetzt),
    ).toEqual({ status: "kein-termin", tageBisFaellig: null });
  });
});

describe("naechsterTermin", () => {
  const ab = zeit("2026-08-10T08:00:00Z");

  it("rechnet das Intervall auf das Startdatum", () => {
    expect(naechsterTermin("zeit", 30, ab)?.toISOString()).toBe(
      "2026-09-09T08:00:00.000Z",
    );
  });

  it("liefert keinen Termin ohne Zeitintervall", () => {
    expect(naechsterTermin("bedarf", 30, ab)).toBeNull();
    expect(naechsterTermin("zeit", null, ab)).toBeNull();
    expect(naechsterTermin("zeit", 0, ab)).toBeNull();
  });
});

describe("intervallLabel", () => {
  const label = (
    intervallTyp: string,
    intervallTage: number | null,
    intervallText: string | null = null,
  ) => intervallLabel({ intervallTyp, intervallTage, intervallText });

  it("bevorzugt den freien Text, wenn einer gepflegt ist", () => {
    expect(label("zeit", 30, "jede Saison")).toBe("jede Saison");
  });

  it("beschreibt zeitbasierte Intervalle in Tagen", () => {
    expect(label("zeit", 30)).toBe("alle 30 Tage");
  });

  it("fällt ohne Tageszahl auf „bei Bedarf“ zurück", () => {
    expect(label("zeit", null)).toBe("bei Bedarf");
    expect(label("bedarf", null)).toBe("bei Bedarf");
  });

  it("benennt spielzahlbasierte Intervalle", () => {
    expect(label("spiele", null)).toBe("nach Spielzahl");
  });
});

describe("SQL-Grenzen", () => {
  const jetzt = zeit("2026-08-10T08:00:00Z"); // 10:00 Berlin

  it("schließt den ganzen heutigen Berliner Tag ein", () => {
    const grenze = faelligBis(jetzt);
    // 23:59 Berlin ist noch fällig, 00:00 des Folgetags nicht mehr.
    expect(zeit("2026-08-10T21:59:00Z") <= grenze).toBe(true);
    expect(zeit("2026-08-10T22:00:00Z") <= grenze).toBe(false);
  });

  it("liegt genau 14 Tage weiter als die Fällig-Grenze", () => {
    const diff = baldBis(jetzt).getTime() - faelligBis(jetzt).getTime();
    expect(diff).toBe(14 * 86_400_000);
  });

  it("stimmt mit faelligkeit() überein", () => {
    // Der eigentliche Punkt des Moduls: SQL-Grenze und TS-Regel dürfen nicht
    // auseinanderlaufen.
    const grenze = faelligBis(jetzt);
    for (const iso of [
      "2026-08-07T16:00:00Z",
      "2026-08-10T06:00:00Z",
      "2026-08-10T16:00:00Z",
      "2026-08-11T16:00:00Z",
    ]) {
      const termin = zeit(iso);
      const perRegel = faelligkeit(punkt(termin), jetzt).status === "faellig";
      expect(termin <= grenze).toBe(perRegel);
    }
  });
});
