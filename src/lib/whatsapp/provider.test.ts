import { afterEach, describe, expect, it } from "vitest";
import {
  getWhatsappProvider,
  whatsappKonfiguriert,
  whatsappVersandAktiv,
} from "@/lib/whatsapp/provider";

/*
  Anbieter-Umschaltung ist reine Env-Logik — hier ohne echten Versand geprüft.
  Jede Prüfung setzt den vollständigen Env-Zustand (unbekannte Keys gelöscht),
  damit vorhandene Umgebungswerte nicht durchschlagen.
*/
const KEYS = [
  "WHATSAPP_PROVIDER",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
] as const;

function setEnv(werte: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) {
    if (werte[k] === undefined) delete process.env[k];
    else process.env[k] = werte[k];
  }
}

const VOLL = {
  TWILIO_ACCOUNT_SID: "AC0",
  TWILIO_AUTH_TOKEN: "tok",
  TWILIO_WHATSAPP_FROM: "whatsapp:+14155238886",
};

afterEach(() => setEnv({}));

describe("getWhatsappProvider", () => {
  it("ist ohne Env 'none'", () => {
    setEnv({});
    expect(getWhatsappProvider()).toBe("none");
  });

  it("ist 'twilio' nur bei WHATSAPP_PROVIDER=twilio", () => {
    setEnv({ WHATSAPP_PROVIDER: "twilio" });
    expect(getWhatsappProvider()).toBe("twilio");
    setEnv({ WHATSAPP_PROVIDER: "irgendwas" });
    expect(getWhatsappProvider()).toBe("none");
  });
});

describe("whatsappKonfiguriert", () => {
  it("verlangt alle drei Twilio-Werte", () => {
    setEnv({ TWILIO_ACCOUNT_SID: "AC0", TWILIO_AUTH_TOKEN: "tok" });
    expect(whatsappKonfiguriert()).toBe(false);
    setEnv(VOLL);
    expect(whatsappKonfiguriert()).toBe(true);
  });
});

describe("whatsappVersandAktiv", () => {
  it("nur bei twilio UND vollständiger Konfiguration", () => {
    setEnv({ WHATSAPP_PROVIDER: "twilio" });
    expect(whatsappVersandAktiv()).toBe(false); // konfiguriert fehlt
    setEnv({ ...VOLL }); // konfiguriert, aber Anbieter none
    expect(whatsappVersandAktiv()).toBe(false);
    setEnv({ WHATSAPP_PROVIDER: "twilio", ...VOLL });
    expect(whatsappVersandAktiv()).toBe(true);
  });
});
