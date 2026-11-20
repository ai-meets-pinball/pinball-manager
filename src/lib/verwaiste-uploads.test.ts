import { describe, expect, it } from "vitest";
import { SCHONFRIST_MS, verwaisteBlobs } from "@/lib/verwaiste-uploads";

const jetzt = new Date("2026-11-20T12:00:00Z");
const alt = new Date(jetzt.getTime() - SCHONFRIST_MS - 1);
const frisch = new Date(jetzt.getTime() - SCHONFRIST_MS + 60_000);
const blob = (pathname: string, uploadedAt = alt) => ({
  url: `https://store.public.blob.vercel-storage.com/${pathname}`,
  pathname,
  uploadedAt,
});

describe("verwaisteBlobs", () => {
  it("leere Liste → nichts", () => {
    expect(verwaisteBlobs([], new Set(), jetzt)).toEqual([]);
  });

  it("alt, im Upload-Ordner, nicht referenziert → verwaist", () => {
    const b = blob("fault-images/u1/foto.png");
    expect(verwaisteBlobs([b], new Set(), jetzt)).toEqual([b]);
  });

  it("referenziert → bleibt", () => {
    const b = blob("machine-photos/u1/foto.png");
    expect(verwaisteBlobs([b], new Set([b.url]), jetzt)).toEqual([]);
  });

  it("innerhalb der Schonfrist → bleibt (Formular wird vielleicht gerade ausgefüllt)", () => {
    expect(verwaisteBlobs([blob("feedback/u1/s.png", frisch)], new Set(), jetzt)).toEqual([]);
  });

  it("genau an der Grenze → bleibt", () => {
    const grenze = new Date(jetzt.getTime() - SCHONFRIST_MS);
    expect(verwaisteBlobs([blob("avatars/u1/a.png", grenze)], new Set(), jetzt)).toEqual([]);
  });

  it("Logos und fremde Ordner werden nie angefasst", () => {
    const blobs = [blob("club-logos/c1/logo.png"), blob("sonstiges/x.png")];
    expect(verwaisteBlobs(blobs, new Set(), jetzt)).toEqual([]);
  });

  it("jeder Direkt-Upload-Ordner zählt (auch Dokumente)", () => {
    const b = blob("machine-docs/u1/rechnung.pdf");
    expect(verwaisteBlobs([b], new Set(), jetzt)).toEqual([b]);
  });
});
