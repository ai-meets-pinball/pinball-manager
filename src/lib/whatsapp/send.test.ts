import { describe, expect, it, vi } from "vitest";
import { sendeWhatsapp, type WhatsappLogZeile } from "@/lib/whatsapp/send";
import { WhatsappError, type WhatsappAdapter } from "@/lib/whatsapp/types";

/*
  send.ts nimmt Adapter UND Protokoll-Schreiber als Parameter — so lassen sich
  Erfolg, Fehlerweitergabe und das „immer protokollieren" ohne DB/Netz prüfen.
*/
const nachricht = {
  an: "+4915100000000",
  text: "Neuer Fehler …",
  templateVars: ["a", "b"],
  anlass: "neuer Fehler",
  faultId: "fault-1",
};

describe("sendeWhatsapp", () => {
  it("sendet über den Adapter und protokolliert Erfolg", async () => {
    const zeilen: WhatsappLogZeile[] = [];
    const adapter: WhatsappAdapter = async () => ({ providerId: "SM123" });

    const erg = await sendeWhatsapp(nachricht, {
      adapter,
      protokoll: async (z) => {
        zeilen.push(z);
      },
    });

    expect(erg.providerId).toBe("SM123");
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toMatchObject({
      empfaenger: "+4915100000000",
      anlass: "neuer Fehler",
      inhalt: "Neuer Fehler …",
      faultId: "fault-1",
      erfolg: true,
      fehler: null,
    });
  });

  it("protokolliert den Fehler und wirft den WhatsappError unverändert weiter", async () => {
    const zeilen: WhatsappLogZeile[] = [];
    const adapter: WhatsappAdapter = async () => {
      throw new WhatsappError("ungueltige-nummer", "Nummer ungültig.");
    };

    await expect(
      sendeWhatsapp(nachricht, {
        adapter,
        protokoll: async (z) => {
          zeilen.push(z);
        },
      }),
    ).rejects.toMatchObject({ art: "ungueltige-nummer" });

    expect(zeilen).toHaveLength(1);
    expect(zeilen[0].erfolg).toBe(false);
    expect(zeilen[0].fehler).toContain("ungueltige-nummer");
  });

  it("verpackt unerwartete Fehler als WhatsappError('sonstiges')", async () => {
    const adapter: WhatsappAdapter = async () => {
      throw new Error("boom");
    };
    await expect(
      sendeWhatsapp(nachricht, { adapter, protokoll: async () => {} }),
    ).rejects.toBeInstanceOf(WhatsappError);
  });

  it("bricht nicht, wenn das Protokoll fehlschlägt (best effort)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter: WhatsappAdapter = async () => ({ providerId: "SM1" });

    const erg = await sendeWhatsapp(nachricht, {
      adapter,
      protokoll: async () => {
        throw new Error("log kaputt");
      },
    });

    expect(erg.providerId).toBe("SM1");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
