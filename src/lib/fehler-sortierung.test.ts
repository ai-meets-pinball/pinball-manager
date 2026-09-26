import { describe, expect, it } from "vitest";
import {
  fehlerSortierungAusParam,
  sortiereFehler,
} from "@/lib/fehler-sortierung";

const f = (id: string, prioritaet: string, tag: number) => ({
  id,
  prioritaet,
  datum: new Date(Date.UTC(2026, 8, tag)),
});

describe("sortiereFehler", () => {
  const fehler = [
    f("mittel-neu", "mittel", 26),
    f("kritisch-alt", "kritisch", 20),
    f("hoch", "hoch", 24),
    f("kritisch-neu", "kritisch", 25),
    f("niedrig", "niedrig", 27),
  ];

  it("nach Priorität: kritisch zuerst, innerhalb die neuesten oben", () => {
    expect(sortiereFehler(fehler, "prioritaet").map((x) => x.id)).toEqual([
      "kritisch-neu",
      "kritisch-alt",
      "hoch",
      "mittel-neu",
      "niedrig",
    ]);
  });

  it("neueste zuerst ignoriert die Priorität", () => {
    expect(sortiereFehler(fehler, "neueste").map((x) => x.id)).toEqual([
      "niedrig",
      "mittel-neu",
      "kritisch-neu",
      "hoch",
      "kritisch-alt",
    ]);
  });

  it("verändert die Eingabe nicht und packt Unbekanntes ans Ende", () => {
    const eingabe = [f("x", "unbekannt", 30), f("k", "kritisch", 1)];
    const kopie = [...eingabe];
    expect(sortiereFehler(eingabe, "prioritaet").map((x) => x.id)).toEqual(["k", "x"]);
    expect(eingabe).toEqual(kopie);
  });
});

describe("fehlerSortierungAusParam", () => {
  it("nimmt gültige Werte, sonst Priorität", () => {
    expect(fehlerSortierungAusParam("neueste")).toBe("neueste");
    expect(fehlerSortierungAusParam("datum")).toBe("prioritaet");
    expect(fehlerSortierungAusParam(undefined)).toBe("prioritaet");
  });
});
