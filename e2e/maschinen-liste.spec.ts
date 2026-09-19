import { expect, test } from "@playwright/test";
import { addFault, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Maschinen-Liste: offene Fehler stehen als Zähler PLUS neueste Beschreibung
  an der Maschine — auf der Karte und in der Tabelle. Feedback 2026-09-18:
  „die Fehlerbeschreibung auch beim einzelnen Gerät, nicht nur in der Übersicht".
*/
test.describe("Maschinen-Liste zeigt offene Fehler", () => {
  let machineId: string;
  let modelId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E-LST-FEHLER",
      modell: "E2E Listengerät",
    }));
    await addFault({ machineId, beschreibung: "E2E Flipperfinger klemmt links" });
    await addFault({
      machineId,
      beschreibung: "E2E Lampe im Backglass dunkel",
      status: "behoben",
    });
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
    await sql`DELETE FROM machine_models WHERE id = ${modelId}`;
  });

  test("Karte: Zähler und neueste Beschreibung, behobene zählen nicht", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto("/machines?ansicht=karten");
    const karte = page.getByRole("link", { name: /E2E Listengerät/ });
    await expect(karte).toContainText("1 offener Fehler");
    await expect(karte).toContainText("E2E Flipperfinger klemmt links");
    await expect(karte).not.toContainText("Lampe im Backglass");
  });

  test("Tabelle: Spalte „Fehler“ mit Zähler", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto("/machines?ansicht=tabelle");
    await expect(page.getByRole("columnheader", { name: "Fehler" })).toBeVisible();
    const zeile = page.getByRole("row", { name: /E2E Listengerät/ });
    await expect(zeile).toContainText("1 offen");
    await expect(zeile).toContainText("E2E Flipperfinger klemmt links");
  });
});
