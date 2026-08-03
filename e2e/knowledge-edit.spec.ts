import { expect, test } from "@playwright/test";
import {
  addKnowledge,
  addSignal,
  createMachine,
  revisionCount,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  In-Place-Editor + Bearbeitungs-Verlauf (Phase 5): der Autor bearbeitet seinen
  Wissenseintrag — die id bleibt stabil (fremde Signale überleben), der alte
  Stand wandert als Revision in den Verlauf. Auch die Neu-Generierung (hier der
  KI-freie JSON-Import-Pfad) aktualisiert in place statt zu ersetzen. Fremde
  sehen weder „Bearbeiten" noch „Verlauf".
*/
const NEUES_JSON = JSON.stringify({
  coils: {
    columns: ["Sol/No", "Funktion"],
    rows: [["1", "E2E Spule NEU"]],
  },
});

test.describe("Wissens-Editor & Verlauf", () => {
  let machineId: string;
  let modelId: string;
  let knowledgeId: string;
  let memberId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    memberId = await userIdByEmail(USERS.member);

    ({ machineId, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E8-EDIT",
    }));
    knowledgeId = await addKnowledge({
      modelId,
      createdBy: ownerId,
      visibility: "oeffentlich",
    });
    // Fremdes Signal — muss jede Bearbeitung/Regeneration überleben.
    await addSignal(knowledgeId, memberId, "hilfreich");
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("Autor bearbeitet in place: id bleibt, Signal überlebt, Revision entsteht", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/modelle/${modelId}`);

    await page.getByText("Bearbeiten").click();
    await page.getByLabel("Titel").fill("E2E Handbuch-Daten v2");
    await page.getByLabel("Fakten (JSON)").fill(NEUES_JSON);
    await page
      .getByLabel("Kommentar zur Änderung (optional)")
      .fill("E2E: Spule korrigiert");

    // Speichern ist erst nach erfolgreicher Prüfung aktiv.
    await expect(page.getByRole("button", { name: "Speichern" })).toBeDisabled();
    await page.getByRole("button", { name: "Prüfen" }).click();
    await expect(page.getByText(/1 Tabelle\(n\) gültig/)).toBeVisible();
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Eintrag gespeichert.")).toBeVisible();

    // Gleiche id, neuer Stand, Signal überlebt, alter Stand im Verlauf.
    const [k] = await sql`SELECT titel FROM knowledge WHERE id = ${knowledgeId}`;
    expect(k?.titel).toBe("E2E Handbuch-Daten v2");
    const signale = await sql`
      SELECT wert FROM knowledge_signals
      WHERE knowledge_id = ${knowledgeId} AND user_id = ${memberId}`;
    expect(signale[0]?.wert).toBe("hilfreich");
    expect(await revisionCount(knowledgeId)).toBe(1);
  });

  test("Verlauf zeigt den alten Stand samt Kommentar", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/modelle/${modelId}`);

    await page.getByText("Verlauf (1)").click();
    await expect(page.getByText(/Stand vor der Änderung vom/)).toBeVisible();
    await expect(page.getByText(/E2E: Spule korrigiert/)).toBeVisible();
    // Der alte Titel aus addKnowledge.
    await expect(page.getByText("E2E Handbuch-Daten", { exact: true })).toBeVisible();
  });

  test("Fremde sehen weder Bearbeiten noch Verlauf", async ({ page }) => {
    await loginAs(page, USERS.member);
    await page.goto(`/modelle/${modelId}`);
    await expect(page.getByText(/Geteilt von/)).toBeVisible();
    await expect(page.getByText("Bearbeiten")).toHaveCount(0);
    await expect(page.getByText(/Verlauf \(/)).toHaveCount(0);
  });

  test("Neu-Generierung (JSON-Import) aktualisiert in place statt zu ersetzen", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}?bereich=handbuch`);

    await page.getByLabel("Extrahiertes JSON").fill(NEUES_JSON);
    // Auf der Maschinen-Seite gibt es zwei „Prüfen" (Editor + Import) — das
    // Import-Formular steht im DOM hinter dem Editor.
    await page.getByRole("button", { name: "Prüfen" }).last().click();
    await expect(page.getByText("· 1 Zeilen")).toBeVisible();
    await page.getByRole("button", { name: "Importieren" }).click();
    await expect(page.getByText(/Importiert: 1 Faktentabelle/)).toBeVisible();

    // Gleiche id (kein DELETE+INSERT), Signal überlebt, zweite Revision.
    const rows = await sql`
      SELECT id FROM knowledge
      WHERE model_id = ${modelId} AND typ = 'handbuch_fakten'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(knowledgeId);
    const signale = await sql`
      SELECT wert FROM knowledge_signals
      WHERE knowledge_id = ${knowledgeId} AND user_id = ${memberId}`;
    expect(signale[0]?.wert).toBe("hilfreich");
    expect(await revisionCount(knowledgeId)).toBe(2);
  });
});
