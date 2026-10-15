import { describe, expect, it } from "vitest";
import {
  dokumentContentType,
  pruefeUploadPfad,
  pruefeUploadUrls,
  uploadPraefix,
  UPLOAD_ZWECKE,
} from "@/lib/upload-zweck";

const HOST = "abc123.public.blob.vercel-storage.com";
const url = (pfad: string) => `https://${HOST}/${pfad}`;

describe("uploadPraefix", () => {
  it("legt je Zweck und Uploader einen eigenen Ordner an", () => {
    expect(uploadPraefix("fehlerfoto", "u1")).toBe("fault-images/u1/");
    expect(uploadPraefix("fehlerfoto", "gast")).toBe("fault-images/gast/");
    expect(uploadPraefix("maschinenfoto", "u1")).toBe("machine-photos/u1/");
    expect(uploadPraefix("dokument", "u1")).toBe("machine-docs/u1/");
  });
});

describe("pruefeUploadPfad (Token-Ausgabe)", () => {
  it("nimmt einen Dateinamen unter dem eigenen Präfix an", () => {
    expect(pruefeUploadPfad("avatar", "u1", "avatars/u1/foto.jpg")).toBe(true);
  });
  it("lehnt fremde Uploader, fremde Ordner und Pfad-Tricks ab", () => {
    for (const p of [
      "avatars/u2/foto.jpg",
      "fault-images/u1/foto.jpg",
      "avatars/u1/../u2/foto.jpg",
      "avatars/u1/sub/foto.jpg",
      "avatars/u1/",
      "/avatars/u1/foto.jpg",
    ]) {
      expect(pruefeUploadPfad("avatar", "u1", p), p).toBe(false);
    }
  });
  it("Gast-Uploads nur für Fehlerfotos", () => {
    expect(pruefeUploadPfad("fehlerfoto", "gast", "fault-images/gast/a.jpg")).toBe(true);
    expect(pruefeUploadPfad("avatar", "gast", "avatars/gast/a.jpg")).toBe(false);
  });
});

describe("pruefeUploadUrls (beim Speichern)", () => {
  it("leere Liste ist erlaubt", () => {
    expect(pruefeUploadUrls("fehlerfoto", "u1", [], HOST)).toEqual({ urls: [] });
  });

  it("nimmt eigene URLs an und entfernt Doppelte", () => {
    const u = url("fault-images/u1/a-XyZ.jpg");
    expect(pruefeUploadUrls("fehlerfoto", "u1", [u, u], HOST)).toEqual({ urls: [u] });
  });

  it("lehnt fremden Host, fremden Uploader, fremden Ordner und http ab", () => {
    for (const u of [
      "https://evil.example.com/fault-images/u1/a.jpg",
      `https://other.public.blob.vercel-storage.com/fault-images/u1/a.jpg`,
      url("fault-images/u2/a.jpg"),
      url("avatars/u1/a.jpg"),
      `http://${HOST}/fault-images/u1/a.jpg`,
      url("fault-images/u1/../u2/a.jpg"),
      "kein-url",
    ]) {
      expect(pruefeUploadUrls("fehlerfoto", "u1", [u], HOST), u).toHaveProperty("error");
    }
  });

  it("lehnt Nicht-Strings ab (FormData kann Dateien liefern)", () => {
    expect(pruefeUploadUrls("fehlerfoto", "u1", [new Blob()], HOST)).toHaveProperty("error");
  });

  it("deckelt die Anzahl an der Grenze des Zwecks", () => {
    const fuenf = [1, 2, 3, 4, 5].map((i) => url(`fault-images/u1/${i}.jpg`));
    expect(pruefeUploadUrls("fehlerfoto", "u1", fuenf, HOST)).toEqual({ urls: fuenf });
    const sechs = [...fuenf, url("fault-images/u1/6.jpg")];
    expect(pruefeUploadUrls("fehlerfoto", "u1", sechs, HOST)).toHaveProperty("error");
    const zwei = [url("avatars/u1/1.jpg"), url("avatars/u1/2.jpg")];
    expect(pruefeUploadUrls("avatar", "u1", zwei, HOST)).toHaveProperty("error");
  });
});

describe("Zweck-Grenzen", () => {
  it("Bilder bis 10 MB, Dokumente bis 25 MB, Fehlerfotos bis 5 Stück", () => {
    expect(UPLOAD_ZWECKE.fehlerfoto.maxBytes).toBe(10 * 1024 * 1024);
    expect(UPLOAD_ZWECKE.fehlerfoto.maxAnzahl).toBe(5);
    expect(UPLOAD_ZWECKE.dokument.maxBytes).toBe(25 * 1024 * 1024);
  });
  it("kein Zweck erlaubt ausführbare Typen", () => {
    for (const z of Object.values(UPLOAD_ZWECKE)) {
      expect(z.typen.some((t) => /html|javascript|svg|^(text|application)\/xml/.test(t))).toBe(false);
    }
  });
});

describe("dokumentContentType", () => {
  it("leitet den Typ aus der Endung ab, nicht vom Browser", () => {
    expect(dokumentContentType("Handbuch.PDF")).toBe("application/pdf");
    expect(dokumentContentType("liste.csv")).toBe("text/csv");
    expect(dokumentContentType("a.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(dokumentContentType("foto.jpeg")).toBe("image/jpeg");
  });
  it("unbekannte oder gefährliche Endungen → null", () => {
    expect(dokumentContentType("seite.html")).toBeNull();
    expect(dokumentContentType("logo.svg")).toBeNull();
    expect(dokumentContentType("ohne-endung")).toBeNull();
  });
});
