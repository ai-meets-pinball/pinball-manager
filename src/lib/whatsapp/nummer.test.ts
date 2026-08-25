import { describe, expect, it } from "vitest";
import { whatsappNummerSchema } from "@/lib/validators";

const parse = (nummer: string) => whatsappNummerSchema.safeParse({ nummer });

describe("whatsappNummerSchema", () => {
  it("akzeptiert eine gültige E.164-Nummer", () => {
    const r = parse("+4915112345678");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nummer).toBe("+4915112345678");
  });

  it("entfernt Leerzeichen und übliche Trenner", () => {
    const r = parse("+49 151 123-456 78");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nummer).toBe("+4915112345678");
  });

  it("erlaubt einen leeren Wert (= Nummer löschen)", () => {
    const r = parse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nummer).toBe("");
  });

  it("lehnt ungültige Formate ab (ohne +, mit Buchstaben, führende 0)", () => {
    expect(parse("015112345678").success).toBe(false);
    expect(parse("+49abc123456").success).toBe(false);
    expect(parse("+0123456789").success).toBe(false);
  });
});
