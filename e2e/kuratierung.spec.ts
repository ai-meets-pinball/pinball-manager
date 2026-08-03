import { expect, test } from "@playwright/test";
import {
  addKnowledge,
  addSignal,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Kuratoren-Moderation: die globale Rolle „kurator" verbirgt geteilte
  Wissenseinträge FÜR ALLE — nur mit Pflicht-Begründung, reversibel. Der Autor
  sieht seinen verborgenen Eintrag weiterhin, markiert samt Grund (kein stilles
  Zensieren); andere Nutzer sehen nichts mehr. Die Melde-Warnung bleibt rein
  anzeigend — gemeldete Einträge erscheinen nur in der Übersicht /kuratierung.
*/
test.describe("Kuratoren-Moderation", () => {
  let ownerMachine: string;
  let fremdMachine: string;
  let modelId: string;
  let knowledgeId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const outsiderId = await userIdByEmail(USERS.outsider);

    ({ machineId: ownerMachine, modelId } = await createMachine({
      ownerId,
      opdbRef: "E2E7-KUR",
    }));
    // Zweite Maschine desselben Modells: darüber prüft der Outsider die Sicht.
    ({ machineId: fremdMachine } = await createMachine({
      ownerId: outsiderId,
      opdbRef: "E2E7-KUR",
    }));
    knowledgeId = await addKnowledge({
      modelId,
      createdBy: ownerId,
      visibility: "oeffentlich",
    });
  });

  test.afterAll(async () => {
    await sql`DELETE FROM knowledge WHERE model_id = ${modelId}`;
    await sql`DELETE FROM machines WHERE id IN (${ownerMachine}, ${fremdMachine})`;
  });

  test("Nicht-Kurator: kein Zugriff auf /kuratierung, kein Verbergen-Knopf", async ({
    page,
  }) => {
    await loginAs(page, USERS.member);
    await page.goto("/kuratierung");
    await page.waitForURL("**/machines");

    await page.goto(`/modelle/${modelId}`);
    // Der Eintrag ist sichtbar (Tabellen selbst sind eingeklappt) …
    await expect(page.getByText(/Geteilt von/)).toBeVisible();
    // … aber ohne Kuratoren-Rolle gibt es keinen Verbergen-Knopf.
    await expect(page.getByRole("button", { name: "Verbergen" })).toHaveCount(0);
  });

  test("Kurator verbirgt nur mit Begründung", async ({ page }) => {
    await loginAs(page, USERS.kurator);
    await page.goto(`/modelle/${modelId}`);

    await page.getByRole("button", { name: "Verbergen" }).click();
    // Ohne Begründung → Fehlermeldung, nichts verborgen.
    await page.getByRole("button", { name: "Für alle verbergen" }).click();
    await expect(page.getByText("Eine Begründung ist erforderlich.")).toBeVisible();

    await page
      .getByPlaceholder(/Begründung/)
      .fill("E2E: Spulendaten nachweislich falsch");
    await page.getByRole("button", { name: "Für alle verbergen" }).click();
    await expect(page.getByText(/Von Kurator .* verborgen/)).toBeVisible();
  });

  test("andere Nutzer sehen den verborgenen Eintrag nicht mehr", async ({
    page,
  }) => {
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    await expect(page.getByText("E2E Spule")).toHaveCount(0);
    await expect(
      page.getByText(/liegen dir gegenüber noch keine Handbuch-Daten vor/),
    ).toBeVisible();
  });

  test("Autor sieht die Markierung samt Grund, aber kein Wiederherstellen", async ({
    page,
  }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${ownerMachine}?bereich=handbuch`);
    await expect(page.getByText(/Von Kurator .* verborgen/)).toBeVisible();
    await expect(
      page.getByText(/Spulendaten nachweislich falsch/),
    ).toBeVisible();
    // Der Inhalt bleibt für den Autor sichtbar (Abschnitts-Navigation da) …
    await expect(page.getByText("Spulen & Flasher").first()).toBeVisible();
    // … aber wiederherstellen können nur Kuratoren.
    await expect(
      page.getByRole("button", { name: "Wiederherstellen" }),
    ).toHaveCount(0);
  });

  test("Übersicht listet Verborgenes; Wiederherstellen wirkt für alle", async ({
    page,
  }) => {
    await loginAs(page, USERS.kurator);
    await page.goto("/kuratierung");

    const zeile = page.getByRole("listitem").filter({
      hasText: "E2E Handbuch-Daten",
    });
    await expect(zeile).toBeVisible();
    await expect(zeile.getByText(/Spulendaten nachweislich falsch/)).toBeVisible();

    // Zweistufiges Bestätigen (ConfirmButton).
    await zeile.getByRole("button", { name: "Wiederherstellen" }).click();
    await zeile
      .getByRole("button", { name: "Ja, wiederherstellen" })
      .click();
    await expect(zeile).toHaveCount(0);

    // Der Outsider sieht den Eintrag wieder.
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    await expect(page.getByText(/Geteilt von/)).toBeVisible();
  });

  test("gemeldete Einträge erscheinen in der Übersicht — bleiben aber sichtbar", async ({
    page,
  }) => {
    const outsiderId = await userIdByEmail(USERS.outsider);
    const memberId = await userIdByEmail(USERS.member);
    await addSignal(knowledgeId, outsiderId, "falsch");
    await addSignal(knowledgeId, memberId, "falsch");

    await loginAs(page, USERS.kurator);
    await page.goto("/kuratierung");
    const gemeldet = page.getByRole("listitem").filter({
      hasText: "E2E Handbuch-Daten",
    });
    await expect(gemeldet).toBeVisible();
    await expect(gemeldet.getByText(/2× falsch/)).toBeVisible();

    // Rein anzeigend: für andere weiterhin sichtbar, inklusive Warnbanner.
    await loginAs(page, USERS.outsider);
    await page.goto(`/machines/${fremdMachine}?bereich=handbuch`);
    await expect(page.getByText(/Geteilt von/)).toBeVisible();
    await expect(page.getByText(/als fehlerhaft gemeldet/)).toBeVisible();
  });
});
