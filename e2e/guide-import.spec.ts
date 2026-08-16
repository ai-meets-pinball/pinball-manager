import { expect, test } from "@playwright/test";
import {
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Troubleshooting-Guide als JSON-Import (KI-freie Alternative, wie beim
  Handbuch-Fakten-Import): Prompt kopieren → extern erzeugen → JSON einfügen →
  „Prüfen" → „Guide importieren". Nur mit Schreibrecht; die Herkunft wird als
  „Importiert (extern erstellt)" gekennzeichnet (model='import').
*/
const GUIDE_JSON = JSON.stringify({
  plattform: "E2E-Plattform WPC-95",
  abschnitte: [
    {
      titel: "1. Sicherheitshinweise",
      bloecke: [{ typ: "text", text: "E2E Sicherheitstext für den Import." }],
    },
  ],
  quellen: ["E2E Manual"],
});

test.describe("Troubleshooting-Guide JSON-Import", () => {
  let machineId: string;
  let modelId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E10-GID",
    }));
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id IN (${modelId})`;
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("ungültiges JSON: Prüfen meldet Fehler, Import bleibt gesperrt", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=guide`);
    await page.getByLabel("Guide-JSON").fill('{ "kaputt": true }');
    await page.getByRole("button", { name: "Prüfen" }).click();
    await expect(page.getByText(/passt nicht zur Guide-Struktur/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guide importieren" }),
    ).toBeDisabled();
  });

  test("gültiges JSON: Import kennzeichnet den Guide als extern erstellt", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=guide`);
    await page.getByLabel("Guide-JSON").fill(GUIDE_JSON);
    await page.getByRole("button", { name: "Prüfen" }).click();
    await expect(page.getByText(/Blöcke \(davon/)).toBeVisible();
    await page.getByRole("button", { name: "Guide importieren" }).click();
    await expect(page.getByText("Guide importiert.")).toBeVisible();

    // In der DB als externer Import gekennzeichnet (inhalt.model = 'import').
    const [row] = await sql`
      SELECT inhalt->>'model' AS model FROM knowledge
      WHERE model_id = ${modelId} AND typ = 'troubleshooting'`;
    expect(row.model).toBe("import");

    // Nach Reload zeigt die Anzeige die Herkunft.
    await page.goto(`/machines/${machineId}?bereich=guide`);
    await expect(
      page.getByText(/Importiert \(extern erstellt\)/),
    ).toBeVisible();
  });
});
