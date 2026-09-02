import { describe, expect, it } from "vitest";
import {
  FEEDBACK_ABSCHLUSS_SATZ,
  FEEDBACK_STATUS_LABEL,
  istAbschluss,
  sollBenachrichtigen,
} from "@/lib/feedback-status";
import { FEEDBACK_STATUS } from "@/lib/validators";

describe("istAbschluss", () => {
  it("erkennt Abschluss-Status", () => {
    expect(istAbschluss("erledigt")).toBe(true);
    expect(istAbschluss("zurückgestellt")).toBe(true);
    expect(istAbschluss("verworfen")).toBe(true);
  });
  it("offen/in Arbeit sind kein Abschluss", () => {
    expect(istAbschluss("offen")).toBe(false);
    expect(istAbschluss("in Arbeit")).toBe(false);
  });
});

describe("sollBenachrichtigen", () => {
  it("mailt beim Übergang in einen Abschluss-Status", () => {
    expect(sollBenachrichtigen("offen", "erledigt", false)).toBe(true);
    expect(sollBenachrichtigen("in Arbeit", "verworfen", false)).toBe(true);
    expect(sollBenachrichtigen("offen", "zurückgestellt", false)).toBe(true);
  });
  it("mailt NICHT bei offen/in Arbeit als Ziel", () => {
    expect(sollBenachrichtigen("offen", "in Arbeit", false)).toBe(false);
    expect(sollBenachrichtigen("erledigt", "offen", true)).toBe(false);
  });
  it("kein Doppel-Mail beim reinen Nachspeichern desselben Abschlusses", () => {
    expect(sollBenachrichtigen("erledigt", "erledigt", false)).toBe(false);
  });
  it("aber Mail, wenn im Abschluss-Status die Antwort geändert wird", () => {
    expect(sollBenachrichtigen("erledigt", "erledigt", true)).toBe(true);
  });
});

describe("FEEDBACK_ABSCHLUSS_SATZ", () => {
  it("hat einen Satz je Abschluss-Status", () => {
    for (const s of ["erledigt", "zurückgestellt", "verworfen"]) {
      expect(typeof FEEDBACK_ABSCHLUSS_SATZ[s]).toBe("string");
    }
  });
});

describe("FEEDBACK_STATUS_LABEL", () => {
  it("hat ein großgeschriebenes Label für jeden Status", () => {
    for (const s of FEEDBACK_STATUS) {
      const label = FEEDBACK_STATUS_LABEL[s];
      expect(typeof label).toBe("string");
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });
});
