import { expect, test, type Page } from "@playwright/test";
import {
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Troubleshooting-Guide als JSON-Import (KI-freie Alternative, wie beim
  Handbuch-Fakten-Import): „Guide erstellen" → „JSON importieren" → Prompt
  kopieren → extern erzeugen → JSON einfügen → „Prüfen" → „Guide importieren". Nur mit Schreibrecht; die Herkunft wird als
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

/* Der Import steckt im Dialog „Guide erstellen" (bzw. „Guide ersetzen") hinter
   dem Modus-Schalter „JSON importieren". */
async function guideDialogOeffnen(page: Page) {
  await page
    .getByRole("button", { name: /Guide (erstellen|ersetzen)/ })
    .click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("tab", { name: "JSON importieren" }).click();
  return dialog;
}

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
    const dialog = await guideDialogOeffnen(page);
    await dialog.getByLabel("Guide-JSON").fill('{ "kaputt": true }');
    await dialog.getByRole("button", { name: "Prüfen" }).click();
    await expect(dialog.getByText(/passt nicht zur Guide-Struktur/)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Guide importieren" }),
    ).toBeDisabled();
  });

  test("gültiges JSON: Import kennzeichnet den Guide als extern erstellt", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=guide`);
    const dialog = await guideDialogOeffnen(page);
    await dialog.getByLabel("Guide-JSON").fill(GUIDE_JSON);
    await dialog.getByRole("button", { name: "Prüfen" }).click();
    await expect(dialog.getByText(/Blöcke \(davon/)).toBeVisible();
    await dialog.getByRole("button", { name: "Guide importieren" }).click();
    // Erfolg schließt den Dialog; der Guide steht danach auf der Seite.
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.getByText("E2E-Plattform WPC-95")).toBeVisible();

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
