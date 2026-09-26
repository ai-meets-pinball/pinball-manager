import { expect, test } from "@playwright/test";
import { addFault, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Eine Reparatur führt den Status ihrer verknüpften Fehler (Feedback 09/2026,
  Kai): „in Arbeit" zieht noch offene Fehler nach, ein behobener bleibt behoben.
  „erledigt" → „behoben" deckt machine-status.spec bereits ab.
*/
test.describe("Reparatur führt den Fehlerstatus", () => {
  let machineId: string;
  let offenId: string;
  let behobenId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E9-REPST" }));
    offenId = await addFault({
      machineId,
      beschreibung: "E2E Offener Fehler",
      status: "offen",
    });
    behobenId = await addFault({
      machineId,
      beschreibung: "E2E Behobener Fehler",
      status: "behoben",
    });
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("Reparatur in Arbeit setzt offene Fehler auf in Arbeit, behobene bleiben", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/repairs/new`);
    // Die Feld-Beschriftung „Behobene Fehler (optional)" hängt am ersten
    // Kästchen mit dran — deshalb über den Wert (Fehler-ID) statt über den Namen.
    await page.locator(`input[name="faultIds"][value="${offenId}"]`).check();
    await page.locator(`input[name="faultIds"][value="${behobenId}"]`).check();
    await page.locator('select[name="status"]').selectOption("in Arbeit");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);

    const rows = await sql`
      SELECT id, status FROM faults WHERE id IN (${offenId}, ${behobenId})`;
    const status = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(status[offenId]).toBe("in Arbeit");
    expect(status[behobenId]).toBe("behoben");
  });
});
