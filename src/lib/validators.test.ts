import { describe, expect, it } from "vitest";
import { machineSchema } from "@/lib/validators";

const basis = { hersteller: "Sega", modell: "Space Jam" };

describe("machineSchema · kaufdatum", () => {
  it("leer → undefined (Feld ist optional)", () => {
    const r = machineSchema.safeParse({ ...basis, kaufdatum: "" });
    expect(r.success && r.data.kaufdatum).toBeUndefined();
  });

  it("JJJJ-MM-TT aus <input type=date> wird übernommen", () => {
    const r = machineSchema.safeParse({ ...basis, kaufdatum: "2024-03-17" });
    expect(r.success && r.data.kaufdatum).toBe("2024-03-17");
  });

  it("Unsinn wird abgelehnt", () => {
    for (const kaufdatum of ["17.03.2024", "2024-13-01", "gestern"]) {
      expect(machineSchema.safeParse({ ...basis, kaufdatum }).success).toBe(
        false,
      );
    }
  });
});
