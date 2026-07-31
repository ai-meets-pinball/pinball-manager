import { expect, test } from "@playwright/test";
import { createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Standard-Wartungspläne (Vorlagen) + PROPAGATION: ein Nutzer legt seinen
  Standard an (Seed aus dem Code-Template), verknüpft eine Maschine, ändert
  einen Punkt IM Standard — und die Maschine zeigt die Änderung. Punkte, die
  der Standard verwaltet, sind an der Maschine nicht einzeln editierbar.
*/
test.describe("Standard-Wartungsplan", () => {
  let machineId: string;
  let ownerId: string;

  test.beforeAll(async () => {
    ownerId = await userIdByEmail(USERS.owner);
    // Idempotenz: evtl. Standard aus früheren Läufen entfernen.
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

    // 1) Eigenen Standard aus dem Template anlegen.
    await page.goto("/wartungsplaene");
    await page
      .getByRole("button", { name: /Meinen Standard anlegen/ })
      .click();
    await expect(page.getByText(/20 Punkte/)).toBeVisible();

    // 2) Maschine mit dem Standard verknüpfen.
    await page.goto(`/machines/${machineId}?bereich=wartung`);
    await page
      .getByRole("button", { name: "Mit Standard verknüpfen" })
      .click();
    await expect(page.getByText(/Verknüpft mit/)).toBeVisible();
    await expect(page.getByText("Batterien tauschen")).toBeVisible();
    // Verwaltete Punkte: kein „Bearbeiten"-Link an der Maschine.
    await expect(page.getByText("Vom Standard verwaltet").first()).toBeVisible();

    // 3) Punkt IM Standard umbenennen …
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
