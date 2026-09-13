import { describe, expect, it } from "vitest";
import { KI_LIMIT, kiLimit } from "./ki-limit";

describe("kiLimit", () => {
  it("erlaubt unterhalb des Limits — auch den letzten freien Aufruf", () => {
    expect(kiLimit(0, false)).toEqual({ erlaubt: true });
    expect(kiLimit(KI_LIMIT.max - 1, false)).toEqual({ erlaubt: true });
  });

  it("sperrt ab dem Limit und nennt Zahl und Fenster", () => {
    const r = kiLimit(KI_LIMIT.max, false);
    expect(r.erlaubt).toBe(false);
    if (!r.erlaubt) expect(r.grund).toMatch(/20 KI-Vorschläge je 60 Minuten/);
    expect(kiLimit(999, false).erlaubt).toBe(false);
  });

  it("nimmt Super-Admins aus", () => {
    expect(kiLimit(999, true)).toEqual({ erlaubt: true });
  });

  it("nimmt ein eigenes Limit an", () => {
    expect(kiLimit(2, false, { max: 2, fensterMinuten: 5 }).erlaubt).toBe(false);
    expect(kiLimit(1, false, { max: 2, fensterMinuten: 5 }).erlaubt).toBe(true);
  });
});
