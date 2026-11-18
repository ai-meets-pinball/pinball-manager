import { describe, expect, it } from "vitest";
import { wissensEbene } from "@/lib/handbuch-ziel";

describe("wissensEbene", () => {
  it("Maschine mit Modell → Modell-Ebene", () => {
    expect(wissensEbene({ machineId: "m1", modelId: "mo1" })).toEqual({
      art: "modell",
      modelId: "mo1",
    });
  });

  it("direkt am Modell, ohne Maschine → Modell-Ebene", () => {
    expect(wissensEbene({ machineId: null, modelId: "mo1" })).toEqual({
      art: "modell",
      modelId: "mo1",
    });
  });

  it("Maschine ohne Katalog-Modell → Maschinen-Ebene", () => {
    expect(wissensEbene({ machineId: "m1", modelId: null })).toEqual({
      art: "maschine",
      machineId: "m1",
    });
  });

  it("weder Modell noch Maschine → Fehler statt eines Eintrags ohne Ebene", () => {
    expect(() => wissensEbene({ machineId: null, modelId: null })).toThrow();
  });
});
