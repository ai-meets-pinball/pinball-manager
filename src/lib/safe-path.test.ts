import { describe, expect, it } from "vitest";
import { istSichererPfad } from "@/lib/safe-path";

/* Open-Redirect-Schutz für das ?von=-Rücksprungziel (Login/QR-Deep-Link). */
describe("istSichererPfad", () => {
  it("erlaubt interne Pfade", () => {
    expect(istSichererPfad("/machines/123?bereich=fehler")).toBe(true);
    expect(istSichererPfad("/m/abc")).toBe(true);
  });

  it("lehnt externe/protokoll-relative Ziele ab", () => {
    expect(istSichererPfad("//evil.com")).toBe(false);
    expect(istSichererPfad("/\\evil.com")).toBe(false); // Backslash → //
    expect(istSichererPfad("https://evil.com")).toBe(false);
    expect(istSichererPfad("evil.com")).toBe(false);
    expect(istSichererPfad("")).toBe(false);
    expect(istSichererPfad(null)).toBe(false);
    expect(istSichererPfad(undefined)).toBe(false);
  });
});
