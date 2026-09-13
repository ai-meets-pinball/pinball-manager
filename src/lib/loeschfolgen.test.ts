import { describe, expect, it } from "vitest";
import { loeschfrage, umhaengbar } from "./loeschfolgen";

const nichts = {
  reparaturenBefoerdert: 0,
  freigegebeneReparaturen: 0,
  wissenUebertragen: 0,
  wissenVerloren: 0,
};
const GRUNDSATZ = "Diese Maschine samt Fehlern, Reparaturen und Wartungspunkten löschen?";

describe("loeschfrage", () => {
  it("bleibt beim Grundsatz, wenn andere nichts verlieren", () => {
    expect(loeschfrage(nichts)).toBe(GRUNDSATZ);
  });

  it("nennt eine beförderte Reparatur im Singular", () => {
    expect(loeschfrage({ ...nichts, reparaturenBefoerdert: 1 })).toBe(
      `${GRUNDSATZ} 1 geteilte Reparatur bleibt als Tipp am Modell erhalten.`,
    );
  });

  it("nennt mehrere beförderte Reparaturen im Plural", () => {
    expect(loeschfrage({ ...nichts, reparaturenBefoerdert: 2 })).toContain(
      "2 geteilte Reparaturen bleiben als Tipps am Modell erhalten.",
    );
  });

  it("nennt eine erlöschende Freigabe im Singular", () => {
    expect(loeschfrage({ ...nichts, freigegebeneReparaturen: 1 })).toContain(
      "1 Reparatur ist für einzelne Personen oder mehrere Clubs freigegeben — diese Freigabe erlischt.",
    );
  });

  it("nennt mehrere erlöschende Freigaben im Plural", () => {
    expect(loeschfrage({ ...nichts, freigegebeneReparaturen: 3 })).toContain(
      "3 Reparaturen sind für einzelne Personen oder mehrere Clubs freigegeben — diese Freigaben erlöschen.",
    );
  });

  it("sagt, wenn Wissen für andere verloren geht", () => {
    expect(loeschfrage({ ...nichts, wissenVerloren: 1 })).toContain(
      "1 Wissenseintrag hängt nur an dieser Maschine und geht für alle verloren.",
    );
    expect(loeschfrage({ ...nichts, wissenVerloren: 2 })).toContain(
      "2 Wissenseinträge hängen nur an dieser Maschine und gehen für alle verloren.",
    );
  });

  it("sagt, wenn Wissen ans Modell übertragen wird", () => {
    expect(loeschfrage({ ...nichts, wissenUebertragen: 1 })).toContain(
      "1 Wissenseintrag wird ans Modell übertragen und bleibt erhalten.",
    );
    expect(loeschfrage({ ...nichts, wissenUebertragen: 2 })).toContain(
      "2 Wissenseinträge werden ans Modell übertragen und bleiben erhalten.",
    );
  });

  it("reiht alle Folgen hinter den Grundsatz — Reparaturen zuerst, Erhaltenes vor Verlorenem", () => {
    const text = loeschfrage({
      reparaturenBefoerdert: 1,
      freigegebeneReparaturen: 1,
      wissenUebertragen: 1,
      wissenVerloren: 1,
    });
    expect(text.startsWith(GRUNDSATZ)).toBe(true);
    expect(text.indexOf("als Tipp")).toBeLessThan(text.indexOf("erlischt"));
    expect(text.indexOf("erlischt")).toBeLessThan(text.indexOf("übertragen"));
    expect(text.indexOf("übertragen")).toBeLessThan(text.indexOf("verloren"));
  });
});

describe("umhaengbar", () => {
  const a = { id: "a", typ: "handbuch_fakten", createdBy: "frank" };
  const b = { id: "b", typ: "guide", createdBy: "frank" };

  it("hängt alles um, wenn am Modell nichts liegt", () => {
    expect(umhaengbar([a, b], [])).toEqual({ umhaengen: ["a", "b"], bleiben: [] });
  });

  it("hat bei leerer Maschinenliste nichts zu tun", () => {
    expect(umhaengbar([], [{ typ: "guide", createdBy: "frank" }])).toEqual({
      umhaengen: [],
      bleiben: [],
    });
  });

  it("lässt liegen, was am Modell denselben Autor UND Typ doppeln würde", () => {
    expect(umhaengbar([a, b], [{ typ: "guide", createdBy: "frank" }])).toEqual({
      umhaengen: ["a"],
      bleiben: ["b"],
    });
  });

  it("stört sich nicht an gleichem Typ eines ANDEREN Autors", () => {
    expect(umhaengbar([b], [{ typ: "guide", createdBy: "uwe" }])).toEqual({
      umhaengen: ["b"],
      bleiben: [],
    });
  });
});
