import { expect, test } from "@playwright/test";
import { sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Feedback-/Bug-Report-System: Nutzer melden Fehler/Wünsche zur APP; der
  Auto-Kontext (Seite, Version, Browser) wird serverseitig erfasst. Eigene
  Meldungen samt Status sieht jeder Melder; ALLE Meldungen sehen Supporter
  (nur lesend) und Super-Admins (Triage: Status + Antwort, Löschen).
*/
test.describe("Feedback & Fehlermeldungen", () => {
  test.afterAll(async () => {
    await sql`DELETE FROM feedback WHERE titel LIKE 'E2E %'`;
  });

  test("Meldung absenden: erscheint unter Meine Meldungen, Auto-Kontext in der DB", async ({
    page,
  }) => {
    await loginAs(page, USERS.member);
    await page.goto("/feedback?von=%2Fmachines");

    await page.getByLabel("Typ").selectOption("fehler");
    await page.getByLabel("Titel").fill("E2E Testmeldung");
    await page
      .getByLabel("Beschreibung")
      .fill("E2E: Beim Speichern passiert nichts.");
    await page.getByRole("button", { name: "Meldung absenden" }).click();
    await expect(
      page.getByText("Danke — deine Meldung ist eingegangen."),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "E2E Testmeldung" }),
    ).toBeVisible();

    const memberId = await userIdByEmail(USERS.member);
    const [row] = await sql`
      SELECT seite, app_version, user_agent, status FROM feedback
      WHERE titel = 'E2E Testmeldung' AND created_by = ${memberId}`;
    expect(row.seite).toBe("/machines");
    expect(row.app_version).toBeTruthy();
    expect(row.user_agent).toContain("Mozilla");
    expect(row.status).toBe("offen");
  });

  test("andere Nutzer sehen fremde Meldungen nicht", async ({ page }) => {
    await loginAs(page, USERS.outsider);
    await page.goto("/feedback");
    await expect(page.getByText("E2E Testmeldung")).toHaveCount(0);
    await expect(page.getByText("Alle Meldungen")).toHaveCount(0);
  });

  test("Supporter sieht alle Meldungen — aber nur lesend", async ({ page }) => {
    await loginAs(page, USERS.supporter);
    await page.goto("/feedback");
    const zeile = page
      .getByRole("listitem")
      .filter({ hasText: "E2E Testmeldung" });
    await expect(zeile).toBeVisible();
    await expect(page.getByText(/Nur-Lese-Ansicht/)).toBeVisible();
    await expect(zeile.getByRole("button", { name: "Speichern" })).toHaveCount(0);
    await expect(zeile.getByRole("button", { name: "Löschen" })).toHaveCount(0);
  });

  test("Super-Admin triagiert: Status + Antwort — der Melder sieht beides", async ({
    page,
  }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/feedback");
    const zeile = page
      .getByRole("listitem")
      .filter({ hasText: "E2E Testmeldung" });
    await zeile.locator("select").selectOption("in Arbeit");
    await zeile
      .getByPlaceholder(/Antwort an den Melder/)
      .fill("E2E: Wir schauen uns das an.");
    await zeile.getByRole("button", { name: "Speichern" }).click();
    await expect(zeile.getByText("Gespeichert.")).toBeVisible();

    await loginAs(page, USERS.member);
    await page.goto("/feedback");
    const meine = page
      .getByRole("listitem")
      .filter({ hasText: "E2E Testmeldung" });
    await expect(meine.getByText("in Arbeit")).toBeVisible();
    await expect(
      meine.getByText(/Wir schauen uns das an\./),
    ).toBeVisible();
  });

  test("Super-Admin löscht (zweistufig)", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/feedback");
    const zeile = page
      .getByRole("listitem")
      .filter({ hasText: "E2E Testmeldung" });
    await zeile.getByRole("button", { name: "Löschen" }).click();
    await zeile.getByRole("button", { name: "Ja, löschen" }).click();
    await expect(zeile).toHaveCount(0);
  });
});
