import { expect, test } from "@playwright/test";
import { list } from "@vercel/blob";
import { sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Handbuch auswerten direkt am MODELL, ohne eigene Maschine (Frank 2026-11-18:
  viele Handbücher, nicht jedes Gerät im Bestand). Weg: Wissensbasis → Modell
  aus dem ganzen Katalog suchen → Modell-Seite → „Handbuch auswerten". Für
  normale Nutzer ist die KI in der App gesperrt — Abo-Weg (JSON einfügen) —,
  der Super-Admin darf sie. Der Eintrag hängt am Modell, gehört dem Autor und
  steht auf privat.

  Große PDFs (> 4 MB) gehen über den PRIVATEN Zwischen-Store
  (lib/handbuch-tmp.ts) — der Test schreibt in den ECHTEN Store und prüft, dass
  danach nichts mehr dort liegt.
*/
const MODELL = "E2E Modellweg Handbuch";
const JSON_FAKTEN = JSON.stringify({
  coils: {
    columns: ["Sol/No", "Funktion"],
    rows: [["1", "E2E Spule am Modell"]],
  },
});

test.describe("Handbuch am Modell", () => {
  let modelId: string;
  let memberId: string;

  test.beforeAll(async () => {
    memberId = await userIdByEmail(USERS.member);
    const [model] = await sql`
      INSERT INTO machine_models (opdb_ref, opdb_group_ref, opdb_machine_ref, hersteller, modell)
      VALUES ('E2EHM-MODELL', 'E2EHM', 'E2EHM-MODELL', 'E2E Werke', ${MODELL})
      ON CONFLICT (opdb_ref) DO UPDATE SET modell = EXCLUDED.modell
      RETURNING id`;
    modelId = model.id;
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM machine_models WHERE id = ${modelId}`;
  });

  test("Mitglied ohne Maschine: Modell suchen, JSON importieren → Modell-Wissen", async ({
    page,
  }) => {
    await loginAs(page, USERS.member);
    await page.goto("/modelle");

    // Das Modell hat noch kein Wissen — die Suche findet es trotzdem.
    await page.getByPlaceholder(/Modell suchen/).fill("Modellweg Handbuch");
    await page.getByRole("button", { name: new RegExp(MODELL) }).click();
    await page.waitForURL(`**/modelle/${modelId}`);

    await page.getByRole("link", { name: "Handbuch auswerten" }).click();
    await page.waitForURL(`**/modelle/${modelId}/handbuch/auswerten`);
    await expect(page.getByRole("button", { name: "In der App" })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Eigenes ChatGPT-/Claude-Abo" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Extrahiertes JSON").fill(JSON_FAKTEN);
    await page.getByRole("button", { name: "Prüfen" }).click();
    await expect(page.getByText("· 1 Zeilen")).toBeVisible();
    await page.getByRole("button", { name: "Importieren" }).click();
    await expect(page.getByText(/Importiert: 1 Faktentabelle/)).toBeVisible();

    const rows = await sql`
      SELECT model_id, machine_id, created_by, visibility FROM knowledge
      WHERE model_id = ${modelId} AND typ = 'handbuch_fakten'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].machine_id).toBeNull();
    expect(rows[0].created_by).toBe(memberId);
    expect(rows[0].visibility).toBe("privat");

    // Zurück am Modell: die Fakten stehen im Handbuch-Reiter.
    await page.goto(`/modelle/${modelId}?bereich=handbuch`);
    await expect(page.getByText("E2E Spule am Modell")).toBeVisible();
  });

  test("Mitglied: direkter POST auf die KI-Route am Modell → 403", async ({ page }) => {
    await loginAs(page, USERS.member);
    const res = await page.request.post(`/api/modelle/${modelId}/extract-manual`, {
      multipart: { attest: "on" },
    });
    expect(res.status()).toBe(403);
  });

  test("Super-Admin: „In der App“ ist am Modell freigeschaltet", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto(`/modelle/${modelId}/handbuch/auswerten`);
    await expect(page.getByRole("button", { name: "In der App" })).toBeEnabled();
  });

  test("Super-Admin: PDF über 4 MB läuft über den privaten Store und ist danach weg", async ({
    page,
  }) => {
    const adminId = await userIdByEmail(USERS.admin);
    // 5 MB ohne PDF-Signatur: Upload, Lesen und Löschen laufen echt, die
    // Signaturprüfung stoppt vor dem Modell — kein KI-Aufruf im Test.
    const unechtesPdf = Buffer.alloc(5 * 1024 * 1024, 0x41);

    await loginAs(page, USERS.admin);
    await page.goto(`/modelle/${modelId}/handbuch/auswerten`);
    await page.getByRole("button", { name: "In der App" }).click();
    await page
      .locator('input[name="manual"]')
      .setInputFiles({ name: "gross.pdf", mimeType: "application/pdf", buffer: unechtesPdf });
    await page.locator('input[name="attest"]').check();
    const tokenAnfrage = page.waitForRequest(
      (r) => r.url().endsWith("/api/handbuch-upload") && r.method() === "POST",
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: "Handbuch auswerten" }).click();
    await tokenAnfrage; // ging wirklich über den Zwischen-Store, nicht durchs Formular

    // Die Meldung kommt aus der Extraktion — also hat die Route das PDF aus dem Store gelesen.
    await expect(page.getByText("Die Datei ist kein PDF (Signatur fehlt).")).toBeVisible({
      timeout: 60_000,
    });
    const rest = await list({
      prefix: `handbuch-tmp/${adminId}/`,
      token: process.env.HANDBUCH_BLOB_READ_WRITE_TOKEN,
    });
    expect(rest.blobs).toEqual([]);
  });

  test("Mitglied bekommt kein Upload-Token für den Zwischen-Store", async ({ page }) => {
    await loginAs(page, USERS.member);
    const res = await page.request.get("/api/handbuch-upload");
    expect(res.status()).toBe(403);
  });
});
