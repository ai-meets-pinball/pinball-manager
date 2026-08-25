import { expect, test } from "@playwright/test";
import { createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Benannte Standard-Wartungspläne (mehrere je Nutzer möglich) + PROPAGATION: ein
  Nutzer legt einen benannten Plan aus der Vorlage an, verknüpft eine Maschine,
  ändert einen Punkt IM Plan — und die Maschine zeigt die Änderung. Vom Plan
  verwaltete Punkte sind an der Maschine nicht einzeln editierbar.
*/
test.describe("Standard-Wartungsplan", () => {
  let machineId: string;
  let ownerId: string;

  test.beforeAll(async () => {
    ownerId = await userIdByEmail(USERS.owner);
    // Idempotenz: evtl. Pläne aus früheren Läufen entfernen.
    await sql`DELETE FROM maintenance_plans WHERE user_id = ${ownerId}`;
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E3-WART" }));
  });

  test.afterAll(async () => {
    await sql`DELETE FROM maintenance_plans WHERE user_id = ${ownerId}`;
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("anlegen → verknüpfen → Änderung propagiert auf die Maschine", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);

    // 1) Einen benannten Plan aus der Vorlage anlegen.
    await page.goto("/wartungsplaene");
    await page.getByLabel("Neuer Plan").fill("E2E Standard");
    await page.getByLabel("aus Standard-Vorlage").check();
    await page.getByRole("button", { name: /Anlegen/ }).click();
    await expect(page.getByText(/20 Punkte/)).toBeVisible();

    // 2) Maschine mit dem Plan verknüpfen (aus dem Picker gewählt).
    await page.goto(`/machines/${machineId}?bereich=wartung`);
    await page.getByRole("button", { name: "Verknüpfen" }).click();
    await expect(page.getByText(/Verknüpft mit/)).toBeVisible();
    await expect(page.getByText("Batterien tauschen")).toBeVisible();
    // Verwaltete Punkte: kein „Bearbeiten"-Link an der Maschine.
    await expect(page.getByText("Vom Standard verwaltet").first()).toBeVisible();

    // 3) Punkt IM Plan umbenennen …
    await page.goto("/wartungsplaene");
    const zeile = page.locator("li", { hasText: "Batterien tauschen" });
    await zeile.getByLabel("Bearbeiten").click();
    await zeile.getByLabel("Titel").fill("Batterien tauschen (E2E)");
    await zeile.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Batterien tauschen (E2E)")).toBeVisible();

    // 4) … und die Maschine zeigt die Änderung (Propagation).
    await page.goto(`/machines/${machineId}?bereich=wartung`);
    await expect(page.getByText("Batterien tauschen (E2E)")).toBeVisible();
  });
});
