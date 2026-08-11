import { describe, expect, it } from "vitest";
import {
  abgeleiteterStatus,
  naechsterStatus,
  schwerster,
} from "@/lib/betriebsstatus";

const fehler = (prioritaet: string, status: string) => ({ prioritaet, status });

describe("abgeleiteterStatus", () => {
  it("nennt eine Maschine ohne Fehler spielbereit", () => {
    expect(abgeleiteterStatus([])).toBe("spielbereit");
  });

  it("schränkt bei einem offenen kritischen Fehler ein", () => {
    expect(abgeleiteterStatus([fehler("kritisch", "offen")])).toBe(
      "eingeschraenkt",
    );
  });

  it("zählt auch „in Arbeit“ als offen", () => {
    expect(abgeleiteterStatus([fehler("kritisch", "in Arbeit")])).toBe(
      "eingeschraenkt",
    );
  });

  it("ignoriert behobene kritische Fehler", () => {
    expect(abgeleiteterStatus([fehler("kritisch", "behoben")])).toBe(
      "spielbereit",
    );
  });

  it("ignoriert offene Fehler unterhalb von kritisch", () => {
    expect(
      abgeleiteterStatus([fehler("hoch", "offen"), fehler("mittel", "offen")]),
    ).toBe("spielbereit");
  });

  it("leitet niemals „außer Betrieb“ ab — das ist nur von Hand setzbar", () => {
    const alle = [fehler("kritisch", "offen"), fehler("hoch", "offen")];
    expect(abgeleiteterStatus(alle)).not.toBe("ausser_betrieb");
  });
});

describe("schwerster", () => {
  it("gibt ohne Maschinen nichts zurück", () => {
    expect(schwerster([])).toBeNull();
  });

  it("zieht den schlimmeren Status", () => {
    expect(schwerster(["spielbereit", "eingeschraenkt"])).toBe(
      "eingeschraenkt",
    );
    expect(schwerster(["eingeschraenkt", "ausser_betrieb"])).toBe(
      "ausser_betrieb",
    );
    expect(schwerster(["ausser_betrieb", "spielbereit"])).toBe(
      "ausser_betrieb",
    );
  });

  it("bleibt bei lauter spielbereiten Maschinen spielbereit", () => {
    expect(schwerster(["spielbereit", "spielbereit"])).toBe("spielbereit");
  });
});

describe("naechsterStatus", () => {
  it("rührt einen von Hand gepinnten Status nicht an", () => {
    const n = naechsterStatus(
      { status: "spielbereit", statusManuell: true },
      [fehler("kritisch", "offen")],
    );
    expect(n).toBeNull();
  });

  it("meldet keine Änderung, wenn der Status schon stimmt", () => {
    expect(
      naechsterStatus({ status: "spielbereit", statusManuell: false }, []),
    ).toBeNull();
    expect(
      naechsterStatus({ status: "eingeschraenkt", statusManuell: false }, [
        fehler("kritisch", "offen"),
      ]),
    ).toBeNull();
  });

  it("schränkt ein, sobald ein kritischer Fehler offen ist", () => {
    expect(
      naechsterStatus({ status: "spielbereit", statusManuell: false }, [
        fehler("kritisch", "offen"),
      ]),
    ).toBe("eingeschraenkt");
  });

  it("gibt frei, sobald der letzte kritische Fehler behoben ist", () => {
    expect(
      naechsterStatus({ status: "eingeschraenkt", statusManuell: false }, [
        fehler("kritisch", "behoben"),
      ]),
    ).toBe("spielbereit");
  });

  it("holt eine auf Automatik zurückgestellte Maschine aus „außer Betrieb“", () => {
    // „Zurück auf Automatik" löst die Pinnung; danach muss der abgeleitete
    // Status greifen, auch wenn er milder ist als der gepinnte.
    expect(
      naechsterStatus({ status: "ausser_betrieb", statusManuell: false }, []),
    ).toBe("spielbereit");
  });
});
