import { expect, test } from "@playwright/test";
import { createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Rauchtest Druckstudio (/machines/<id>/qr): Die Seite lädt ohne Hydration-
  Fehler, die Druck-Wurzel hängt per Portal am <body> (Mount-Schalter per
  useSyncExternalStore, 1.86) und gespeicherte Einstellungen werden nach dem
  Mount aus localStorage übernommen.
*/
test.describe("QR-Druckstudio", () => {
  let machineId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E9-QRDRUCK" }));
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("lädt ohne Hydration-Fehler, Portal hängt am body", async ({ page }) => {
    const fehler: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat/i.test(m.text())) fehler.push(m.text());
    });
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/qr`);
    await expect(page.getByRole("button", { name: "Drucken" })).toBeVisible();
    await expect(page.locator("body > #qr-print-root")).toHaveCount(1);
    expect(fehler).toEqual([]);
  });

  test("übernimmt gespeicherte Einstellungen nach dem Mount", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/qr`);
    await expect(page.getByRole("checkbox", { name: "Name", exact: true })).toBeChecked();
    // Wie nach einem früheren Besuch: „Name" aus gespeichert, dann neu laden.
    await page.evaluate(() =>
      localStorage.setItem("qr-print-einstellungen", JSON.stringify({ zeigeName: false })),
    );
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Name", exact: true })).not.toBeChecked();
  });
});
