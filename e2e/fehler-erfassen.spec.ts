import { expect, test } from "@playwright/test";
import { del } from "@vercel/blob";
import { addFault, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Feedback-Runde 15.10.: neue Kategorien (Amu), „Speichern & nächster Fehler"
  (Amu), die Fehler-Werkzeuge direkt in der Übersicht (Dirk) und Fotos per
  Direkt-Upload in den Blob-Speicher (Kai). Der Foto-Test schreibt in den
  ECHTEN Store (es gibt nur einen) und löscht seine Datei in afterAll.
*/
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
test.describe("Fehler erfassen", () => {
  let machineId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({ ownerId, opdbRef: "E2E9-ERF" }));
  });

  const hochgeladen: string[] = [];

  test.afterAll(async () => {
    if (hochgeladen.length > 0) await del(hochgeladen);
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("Foto geht direkt in den Speicher und hängt am Fehler", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/faults/new`);
    await page.getByLabel("Beschreibung / Symptom").fill("E2E Fehler mit Foto");
    await page
      .locator('input[type="file"][accept="image/*"]')
      .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    // Hochgeladen = die URL steht als verstecktes Feld im Formular.
    await expect(page.locator('input[name="bildUrl"]')).toHaveCount(1, { timeout: 30_000 });
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);

    const [r] = await sql`
      SELECT fi.url FROM fault_images fi JOIN faults f ON f.id = fi.fault_id
      WHERE f.machine_id = ${machineId} AND f.beschreibung = 'E2E Fehler mit Foto'`;
    hochgeladen.push(r.url as string);
    expect(new URL(r.url as string).host).toMatch(/\.public\.blob\.vercel-storage\.com$/);
    const res = await fetch(r.url as string, { method: "HEAD" });
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  test("Speichern & nächster: zwei Fehler am Stück, neue Kategorie", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/faults/new`);
    await page.getByLabel("Beschreibung / Symptom").fill("E2E Ball hängt am Scoop");
    await page.locator('select[name="kategorie"]').selectOption("Ballhänger");
    await page.getByRole("button", { name: "Speichern & nächster Fehler" }).click();

    // Zurück im leeren Formular, mit Bestätigung.
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}/faults/new` && u.searchParams.has("gespeichert"));
    await expect(page.getByRole("status").filter({ hasText: "Fehler gespeichert" })).toBeVisible();
    await expect(page.getByLabel("Beschreibung / Symptom")).toHaveValue("");

    await page.getByLabel("Beschreibung / Symptom").fill("E2E Linker Finger schwach");
    await page.locator('select[name="kategorie"]').selectOption("Flipperfinger");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);

    const rows = await sql`
      SELECT beschreibung, kategorie FROM faults WHERE machine_id = ${machineId}
      AND beschreibung IN ('E2E Ball hängt am Scoop', 'E2E Linker Finger schwach') ORDER BY datum`;
    expect(rows.map((r) => [r.beschreibung, r.kategorie])).toEqual([
      ["E2E Ball hängt am Scoop", "Ballhänger"],
      ["E2E Linker Finger schwach", "Flipperfinger"],
    ]);
  });

  test("alte Kategorie bleibt beim Bearbeiten erhalten", async ({ page }) => {
    const faultId = await addFault({ machineId, beschreibung: "E2E Altkategorie" });
    await sql`UPDATE faults SET kategorie = 'Elektronik' WHERE id = ${faultId}`;
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/faults/${faultId}/edit`);
    await expect(page.locator('select[name="kategorie"]')).toHaveValue("Elektronik");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);
    const [r] = await sql`SELECT kategorie FROM faults WHERE id = ${faultId}`;
    expect(r.kategorie).toBe("Elektronik");
  });

  test("Übersicht: offene Fehler mit Reparatur, Bearbeiten und Löschen", async ({ page }) => {
    await addFault({ machineId, beschreibung: "E2E Ball hängt am Scoop" });
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=uebersicht`);
    const zeile = page.getByRole("row").filter({ hasText: "E2E Ball hängt am Scoop" }).first();
    await expect(zeile.getByRole("link", { name: "Reparatur" })).toBeVisible();
    await zeile.getByRole("link", { name: "Fehler bearbeiten" }).click();
    await page.waitForURL((u) => u.pathname.endsWith("/edit"));
    await expect(page.getByLabel("Beschreibung / Symptom")).toHaveValue("E2E Ball hängt am Scoop");
  });
});
