import { describe, expect, it } from "vitest";
import { einladungGesperrt } from "@/lib/einladung";

const jetzt = new Date("2026-09-02T12:00:00Z");
const offen = {
  status: "pending",
  expiresAt: new Date("2026-09-03T12:00:00Z"),
  email: "Anna@Example.org",
};

describe("einladungGesperrt", () => {
  it("lässt eine offene, passende Einladung durch — Groß/Klein egal", () => {
    expect(einladungGesperrt(offen, "anna@example.org", jetzt)).toBeNull();
    expect(einladungGesperrt(offen, null, jetzt)).toBeNull();
  });

  it("sperrt fehlende, verbrauchte und abgelaufene Einladungen", () => {
    expect(einladungGesperrt(null, null, jetzt)).toBe(
      "Einladung ungültig oder bereits verwendet.",
    );
    expect(einladungGesperrt({ ...offen, status: "accepted" }, null, jetzt)).toBe(
      "Einladung ungültig oder bereits verwendet.",
    );
    expect(
      einladungGesperrt(
        { ...offen, expiresAt: new Date("2026-09-02T11:59:59Z") },
        null,
        jetzt,
      ),
    ).toBe("Einladung ist abgelaufen.");
  });

  it("sperrt das falsche Konto", () => {
    expect(einladungGesperrt(offen, "bob@example.org", jetzt)).toBe(
      "Diese Einladung gilt für eine andere E-Mail-Adresse.",
    );
  });
});
