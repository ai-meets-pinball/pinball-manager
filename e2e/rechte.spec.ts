import { expect, test } from "@playwright/test";
import {
  addMember,
  createClub,
  createMachine,
  sql,
  userIdByEmail,
} from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Rechte an Maschinen. Deckt zwei Funde aus dem Security-Review ab:
  - Ein einfaches Club-Mitglied konnte eine fremde Maschine in einen eigenen
    Club verschieben (Club-Re-Homing).
  - Die Detailseite zeigte „Löschen" auch dem, der es gar nicht darf.
*/

test.describe("Maschinen-Rechte", () => {
  let clubId: string;
  let fremdClubId: string;
  let machineId: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const memberId = await userIdByEmail(USERS.member);

    clubId = await createClub("E2E Heimatclub", ownerId);
    await addMember(clubId, memberId, "member");

    // Der Club des einfachen Mitglieds — Ziel eines Re-Homing-Versuchs.
    fremdClubId = await createClub("E2E Fremdclub", memberId);

    ({ machineId } = await createMachine({ ownerId, clubId }));
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
    await sql`DELETE FROM clubs WHERE id IN (${clubId}, ${fremdClubId})`;
  });

  test("einfaches Mitglied kann die Club-Zuordnung NICHT ändern", async ({ page }) => {
    await loginAs(page, USERS.member);
    await page.goto(`/machines/${machineId}/edit`);

    // Versuch, die Maschine in den eigenen Club zu ziehen.
    const clubSelect = page.getByLabel("Club");
    await clubSelect.selectOption(fremdClubId).catch(() => {
      /* Auswahl evtl. gar nicht angeboten — auch das ist ein gültiges Ergebnis */
    });
    await page.getByRole("button", { name: /speichern|aktualisieren/i }).click();

    const [m] = await sql`SELECT club_id FROM machines WHERE id = ${machineId}`;
    expect(
      m.club_id,
      "die Maschine muss im ursprünglichen Club bleiben",
    ).toBe(clubId);
  });

  test("einfaches Mitglied sieht keinen Löschen-Knopf", async ({ page }) => {
    await loginAs(page, USERS.member);
    await page.goto(`/machines/${machineId}`);
    await expect(page.getByRole("button", { name: "Löschen" })).toHaveCount(0);
  });

  test("Eigentümer sieht den Löschen-Knopf", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}`);
    await expect(page.getByRole("button", { name: "Löschen" })).toBeVisible();
  });

  test("Aussenstehender bekommt keinen Zugriff", async ({ page }) => {
    await loginAs(page, USERS.outsider);
    const res = await page.goto(`/machines/${machineId}`);
    // Kein Zugriff → Fehlerseite oder Weiterleitung, jedenfalls kein Inhalt.
    expect(res?.status()).not.toBe(200);
  });
});
