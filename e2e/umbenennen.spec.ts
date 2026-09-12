import { expect, test } from "@playwright/test";
import { createAccount, loginAs, USERS } from "./helpers/auth";
import {
  createMachine,
  setModelGeneration,
  sql,
  userIdByEmail,
} from "./helpers/db";

/*
  Die beiden Umbenennen-Dialoge (Plan in plan-header.tsx, Generation in
  generation-row.tsx) hatten bisher KEIN E2E-Netz — kein Spec öffnete sie.
  Dieses hier ist die Absicherung, bevor beide auf einen gemeinsamen
  RenameDialog gezogen werden: es muss vor UND nach dem Umbau unverändert grün
  sein.

  Der Konfliktfall prüft nebenbei den React-19-Form-Reset (siehe Memory
  react19-form-reset): der Dialog bleibt bei einem Fehler offen, das Feld ist
  gesteuert — die Eingabe darf dabei nicht verschwinden.
*/
test.describe("Umbenennen-Dialoge", () => {
  let ownerId: string;

  test.beforeAll(async ({ request }) => {
    await createAccount(request, USERS.admin).catch(() => {});
    await createAccount(request, USERS.owner).catch(() => {});
    ownerId = await userIdByEmail(USERS.owner);
  });

  test.afterAll(async () => {
    await sql`DELETE FROM maintenance_plans WHERE user_id = ${ownerId} AND name LIKE 'E2E Umben%'`;
    await sql`DELETE FROM machines WHERE opdb_ref LIKE 'UMB%'`;
    await sql`DELETE FROM machine_models WHERE opdb_ref LIKE 'UMB%'`;
    await sql`DELETE FROM generations WHERE name LIKE 'E2E Gen %'`;
  });

  test("Plan umbenennen: Dialog schließt, Kopf zeigt den neuen Namen", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto("/wartungsplaene");
    await page.getByRole("button", { name: "Neuer Plan" }).click();
    const neu = page.locator("dialog[open]");
    await neu.getByLabel("Name").fill("E2E Umbenennen");
    await neu.getByRole("button", { name: /Anlegen/ }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);

    await page.getByRole("button", { name: "Plan umbenennen" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog.getByRole("heading", { name: "Plan umbenennen" })).toBeVisible();
    await dialog.getByLabel("Name").fill("E2E Umbenannt");
    await dialog.getByRole("button", { name: "Speichern" }).click();

    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "E2E Umbenannt" })).toBeVisible();
  });

  test("Generation umbenennen — und ein Namenskonflikt behält die Eingabe", async ({
    page,
  }) => {
    const adminId = await userIdByEmail(USERS.admin);
    const a = await createMachine({ ownerId: adminId, opdbRef: "UMB1-AAA", modell: "Umb A" });
    const b = await createMachine({ ownerId: adminId, opdbRef: "UMB2-BBB", modell: "Umb B" });
    await setModelGeneration(a.modelId, "E2E Gen Alt");
    await setModelGeneration(b.modelId, "E2E Gen Konflikt");

    await loginAs(page, USERS.admin);
    await page.goto("/admin/generationen");

    // Erfolgsfall.
    await page.getByRole("button", { name: "E2E Gen Alt umbenennen" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.getByLabel("Name").fill("E2E Gen Neu");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    // Über den Stift der Zeile prüfen — der Name steht im Kopf UND im
    // aria-label, ein getByText auf den Namen wäre mehrdeutig.
    await expect(
      page.getByRole("button", { name: "E2E Gen Neu umbenennen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "E2E Gen Alt umbenennen" }),
    ).toHaveCount(0);

    // Konfliktfall: der Fehler kommt aus der Action, der Dialog bleibt offen —
    // und das gesteuerte Feld muss die Eingabe behalten (Form-Reset!).
    await page.getByRole("button", { name: "E2E Gen Neu umbenennen" }).click();
    const konflikt = page.locator("dialog[open]");
    await konflikt.getByLabel("Name").fill("E2E Gen Konflikt");
    await konflikt.getByRole("button", { name: "Speichern" }).click();
    await expect(konflikt.getByText(/gibt es bereits/)).toBeVisible();
    await expect(
      konflikt.getByLabel("Name"),
      "die Eingabe darf beim Fehler nicht verschwinden",
    ).toHaveValue("E2E Gen Konflikt");
    await konflikt.getByRole("button", { name: "Abbrechen" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });
});
