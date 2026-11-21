import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/session";

/*
  Copyright-Leitplanke für GROSSE Handbücher (lib/handbuch-tmp.ts): ein PDF aus
  dem privaten Zwischen-Store wird nach der Auswertung gelöscht — bei Erfolg,
  bei einem Fehler der Extraktion und auch, wenn schon das Lesen scheitert.
  Store, KI-Regel und Extraktion sind gefälscht; echt ist der Kern
  (handbuchStreamAntwort) samt Pfadprüfung und Stream.
*/

const holeHandbuch = vi.hoisted(() => vi.fn());
const loescheHandbuch = vi.hoisted(() => vi.fn());
const extractManualFactsStream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/handbuch-speicher", () => ({ holeHandbuch, loescheHandbuch }));
vi.mock("@/lib/manual-extract", () => ({ extractManualFactsStream }));
vi.mock("@/db/queries/settings", () => ({ getKiInDerApp: async () => true }));
vi.mock("@/lib/ki-zugang", () => ({
  darfKi: () => ({ erlaubt: true }),
  darfEigenenSchluessel: () => false,
}));

const { handbuchStreamAntwort } = await import("@/lib/handbuch-route");

const user = { id: "u1" } as SessionUser;
const ziel = { machineId: null, modelId: "mo1", hersteller: "Williams", modell: "Monster Bash" };
const PFAD = "handbuch-tmp/u1/handbuch-AbC.pdf";

function anfrage(felder: Record<string, string>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(felder)) fd.set(k, v);
  return new Request("http://localhost/api/x", { method: "POST", body: fd });
}

async function lauf(felder: Record<string, string>) {
  const res = await handbuchStreamAntwort({ user, ziel, request: anfrage(felder) });
  const text = await res.text();
  return { status: res.status, events: text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  holeHandbuch.mockResolvedValue(new File(["%PDF"], "handbuch-AbC.pdf", { type: "application/pdf" }));
  loescheHandbuch.mockResolvedValue(undefined);
});

describe("handbuchStreamAntwort mit Zwischen-PDF", () => {
  it("Erfolg: liest aus dem Store, wertet aus, löscht", async () => {
    extractManualFactsStream.mockImplementation(async function* (opts: { file: File }) {
      expect(opts.file.name).toBe("handbuch-AbC.pdf");
      yield { type: "done", counts: { coils: 3 } };
    });
    const { events } = await lauf({ blobPfad: PFAD, attest: "on" });
    expect(holeHandbuch).toHaveBeenCalledWith(PFAD);
    expect(events.at(-1)).toEqual({ type: "done", counts: { coils: 3 } });
    expect(loescheHandbuch).toHaveBeenCalledWith(PFAD);
  });

  it("Extraktion wirft: Fehler-Event, PDF trotzdem gelöscht", async () => {
    extractManualFactsStream.mockImplementation(async function* () {
      yield { type: "start", mode: "text", totalPages: 1, totalBatches: 1 };
      throw new Error("Modell weg");
    });
    const { events } = await lauf({ blobPfad: PFAD, attest: "on" });
    expect(events.at(-1).type).toBe("error");
    expect(loescheHandbuch).toHaveBeenCalledWith(PFAD);
  });

  it("Lesen scheitert: Fehler-Event, Löschen wird trotzdem versucht", async () => {
    holeHandbuch.mockRejectedValue(new Error("weg"));
    const { events } = await lauf({ blobPfad: PFAD, attest: "on" });
    expect(events.at(-1).type).toBe("error");
    expect(extractManualFactsStream).not.toHaveBeenCalled();
    expect(loescheHandbuch).toHaveBeenCalledWith(PFAD);
  });

  it("fremder Pfad: 400, nichts gelesen, nichts gelöscht", async () => {
    const { status } = await lauf({ blobPfad: "handbuch-tmp/u2/handbuch.pdf", attest: "on" });
    expect(status).toBe(400);
    expect(holeHandbuch).not.toHaveBeenCalled();
    expect(loescheHandbuch).not.toHaveBeenCalled();
  });

  it("kleines PDF im Formular: kein Store-Zugriff", async () => {
    extractManualFactsStream.mockImplementation(async function* () {
      yield { type: "done", counts: {} };
    });
    const fd = new FormData();
    fd.set("manual", new File(["%PDF"], "klein.pdf", { type: "application/pdf" }));
    fd.set("attest", "on");
    const res = await handbuchStreamAntwort({
      user,
      ziel,
      request: new Request("http://localhost/api/x", { method: "POST", body: fd }),
    });
    await res.text();
    expect(holeHandbuch).not.toHaveBeenCalled();
    expect(loescheHandbuch).not.toHaveBeenCalled();
  });
});
