import { describe, expect, it } from "vitest";
import {
  abgelaufeneHandbuecher,
  HANDBUCH_TMP_SCHONFRIST_MS,
  handbuchTmpPraefix,
  pruefeHandbuchPfad,
} from "@/lib/handbuch-tmp";

describe("pruefeHandbuchPfad", () => {
  it("eigener Ordner, PDF-Name → ok", () => {
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u1/handbuch-AbC123.pdf")).toBe(true);
  });

  it("fremder Ordner → nein", () => {
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u2/handbuch.pdf")).toBe(false);
  });

  it("Präfix-Trick mit längerer ID → nein", () => {
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u10/handbuch.pdf")).toBe(false);
  });

  it("Unterordner, .. oder führender Punkt → nein", () => {
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u1/x/handbuch.pdf")).toBe(false);
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u1/../u2/handbuch.pdf")).toBe(false);
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u1/.pdf")).toBe(false);
  });

  it("keine PDF-Endung → nein", () => {
    expect(pruefeHandbuchPfad("u1", "handbuch-tmp/u1/handbuch.png")).toBe(false);
  });

  it("leere Nutzer-ID → nein", () => {
    expect(pruefeHandbuchPfad("", "handbuch-tmp//handbuch.pdf")).toBe(false);
  });

  it("anderer Ordner (Foto-Store-Pfad) → nein", () => {
    expect(pruefeHandbuchPfad("u1", "machine-docs/u1/handbuch.pdf")).toBe(false);
  });

  it("Präfix passt zur Prüfung", () => {
    expect(pruefeHandbuchPfad("u1", `${handbuchTmpPraefix("u1")}a.pdf`)).toBe(true);
  });
});

describe("abgelaufeneHandbuecher", () => {
  const jetzt = new Date("2026-11-21T12:00:00Z");
  const vor = (ms: number) => new Date(jetzt.getTime() - ms);
  const blob = (pathname: string, uploadedAt: Date) => ({ pathname, uploadedAt });

  it("leere Liste → nichts", () => {
    expect(abgelaufeneHandbuecher([], jetzt)).toEqual([]);
  });

  it("älter als die Schonfrist → weg", () => {
    const b = blob("handbuch-tmp/u1/a.pdf", vor(HANDBUCH_TMP_SCHONFRIST_MS + 1));
    expect(abgelaufeneHandbuecher([b], jetzt)).toEqual([b]);
  });

  it("läuft vielleicht noch (innerhalb / genau an der Grenze) → bleibt", () => {
    const blobs = [
      blob("handbuch-tmp/u1/a.pdf", vor(60_000)),
      blob("handbuch-tmp/u1/b.pdf", vor(HANDBUCH_TMP_SCHONFRIST_MS)),
    ];
    expect(abgelaufeneHandbuecher(blobs, jetzt)).toEqual([]);
  });

  it("außerhalb des Ordners wird nie angefasst", () => {
    const b = blob("sonstiges/a.pdf", vor(HANDBUCH_TMP_SCHONFRIST_MS * 10));
    expect(abgelaufeneHandbuecher([b], jetzt)).toEqual([]);
  });
});
