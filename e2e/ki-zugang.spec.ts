import { expect, test } from "@playwright/test";
import { createAccount, loginAs, USERS } from "./helpers/auth";
import { addGuide, createMachine, sql, userIdByEmail } from "./helpers/db";

/*
  KI-Zugang (lib/ki-zugang): die Generierung in der App (Handbuch, Guide,
  Wartungspunkte) ist dem Betreiber vorbehalten — normale Nutzer sehen die
  Wege gesperrt mit Grund und starten im Prompt-Weg; der Super-Admin hat alles.
  Der Server prüft dieselbe Regel (403 an der Extraktions-Route). Dazu die
  Import-Prüfung mit Tipps und Nachfrage (lib/import-tipps).
*/
test.describe("KI-Zugang", () => {
  let ownerId: string;
  let machineId: string;

  test.beforeAll(async ({ request }) => {
    await createAccount(request, USERS.admin).catch(() => {});
    await createAccount(request, USERS.owner).catch(() => {});
    ownerId = await userIdByEmail(USERS.owner);
    const m = await createMachine({ ownerId, opdbRef: "KIZ1-AAA" });
    machineId = m.machineId;
    // Eigener Guide → der Wartungs-Reiter zeigt „Aus Guide übernehmen".
    await addGuide({ createdBy: ownerId, modelId: m.modelId });
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE created_by = ${ownerId} AND typ = 'troubleshooting'`;
    await sql`DELETE FROM machines WHERE opdb_ref LIKE 'KIZ%'`;
    await sql`DELETE FROM machine_models WHERE opdb_ref LIKE 'KIZ%'`;
  });

  test("Nutzer: KI in der App gesperrt mit Grund, Prompt-Weg ist der Start", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);

    await page.goto(`/machines/${machineId}?bereich=guide`);
    await page.getByRole("button", { name: /Guide (erstellen|ersetzen)/ }).click();
    const guide = page.locator("dialog[open]");
    await expect(guide.getByRole("tab", { name: "Per KI erzeugen" })).toBeDisabled();
    await expect(guide.getByRole("tab", { name: "JSON importieren" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(guide.getByText(/dem Betreiber vorbehalten/)).toBeVisible();
    await expect(guide.getByText(/Der Weg für alle/)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(`/machines/${machineId}?bereich=handbuch`);
    await page.getByRole("button", { name: "Handbuch auswerten" }).click();
    const handbuch = page.locator("dialog[open]");
    await expect(handbuch.getByRole("button", { name: "In der App" })).toBeDisabled();
    await expect(
      handbuch.getByRole("button", { name: "Eigenes ChatGPT-/Claude-Abo" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");

    await page.goto(`/machines/${machineId}?bereich=wartung`);
    await expect(page.getByRole("button", { name: "Aus Guide übernehmen" })).toBeDisabled();
  });

  test("Super-Admin: dieselben Wege sind offen", async ({ page }) => {
    await loginAs(page, USERS.admin);

    await page.goto(`/machines/${machineId}?bereich=guide`);
    await page.getByRole("button", { name: /Guide (erstellen|ersetzen)/ }).click();
    const guide = page.locator("dialog[open]");
    await expect(guide.getByRole("tab", { name: "Per KI erzeugen" })).toBeEnabled();
    await expect(guide.getByRole("tab", { name: "Per KI erzeugen" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("Escape");

    await page.goto(`/machines/${machineId}?bereich=handbuch`);
    await page.getByRole("button", { name: "Handbuch auswerten" }).click();
    await expect(
      page.locator("dialog[open]").getByRole("button", { name: "In der App" }),
    ).toBeEnabled();
  });

  test("Super-Admin schaltet die KI in der App ab — und sieht den Prompt-Weg wie alle", async ({
    page,
  }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/account");
    const schalter = page.getByLabel(/KI in der App nutzen/);
    await expect(schalter).toBeChecked();
    await schalter.click();
    await expect(schalter).not.toBeChecked();

    await page.goto(`/machines/${machineId}?bereich=guide`);
    await page.getByRole("button", { name: /Guide (erstellen|ersetzen)/ }).click();
    const guide = page.locator("dialog[open]");
    await expect(guide.getByRole("tab", { name: "Per KI erzeugen" })).toBeDisabled();
    // Exakt der Nutzer-Wortlaut — kein Sonderhinweis für den Super-Admin.
    await expect(guide.getByText(/dem Betreiber vorbehalten/)).toBeVisible();
    await expect(guide.getByText(/abgeschaltet/)).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Wieder einschalten — die anderen Tests erwarten den offenen Weg.
    await page.goto("/account");
    await page.getByLabel(/KI in der App nutzen/).click();
    await expect(page.getByLabel(/KI in der App nutzen/)).toBeChecked();
  });

  test("Server: die Extraktions-Route lehnt Nutzer ab (403)", async ({ page }) => {
    await loginAs(page, USERS.owner);
    const res = await page.request.post(`/api/machines/${machineId}/extract-manual`, {
      multipart: { attest: "on" },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toMatch(/Betreiber/);
  });

  test("Prüfung: abgeschnittenes JSON bekommt Tipp und Nachfrage", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=handbuch`);
    await page.getByRole("button", { name: "Handbuch auswerten" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog
      .getByLabel("Extrahiertes JSON")
      .fill('{"coils": {"columns": ["Sol/No", "Funktion"], "rows": [["1", "Flipper');
    await dialog.getByRole("button", { name: "Prüfen" }).click();
    await expect(dialog.getByText(/abgeschnitten/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Nachfrage kopieren" })).toBeVisible();
  });
});
