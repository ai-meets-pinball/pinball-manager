import { describe, expect, it } from "vitest";
import { parseFacts } from "./import-facts";
import { troubleshootingGuideSchema } from "./validators";
import { BEISPIEL_FAKTEN, BEISPIEL_GUIDE } from "./wissen-beispiel";

/*
  Die Vorschau nutzt dieselben Anzeige-Komponenten wie echte Daten — also
  müssen die Beispiele auch dieselbe Prüfung bestehen, sonst zeigt die
  Vorschau etwas, das ein Import so nie durchließe.
*/
describe("Beispiel-Inhalte", () => {
  it("Handbuch-Fakten bestehen die Import-Prüfung ohne Fehler und Warnungen", () => {
    const r = parseFacts(BEISPIEL_FAKTEN);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.present).toEqual(["coils", "switches", "fuses"]);
    // Die Schalter-Matrix soll als Raster erscheinen — das ist der Aha-Effekt.
    expect(r.reports.find((x) => x.typ === "switches")?.matrix).toBe(true);
  });

  it("der Guide entspricht dem Schema und zeigt alle drei Block-Typen", () => {
    expect(troubleshootingGuideSchema.safeParse(BEISPIEL_GUIDE).success).toBe(true);
    const typen = new Set(BEISPIEL_GUIDE.abschnitte.flatMap((a) => a.bloecke.map((b) => b.typ)));
    expect([...typen].sort()).toEqual(["tabelle", "text", "warnung"]);
  });
});
