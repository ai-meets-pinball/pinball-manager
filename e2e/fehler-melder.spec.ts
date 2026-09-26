import { expect, test } from "@playwright/test";
import { addFault, addMember, createClub, createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  „Gemeldet von" beim Bearbeiten eines Fehlers (Feedback 09/2026): ein
  Club-Mitglied oder ein Gast mit Namen — die Fehlerliste zeigt danach den
  neuen Melder.
*/
test.describe("Fehler: Melder ändern", () => {
  let clubId: string;
  let machineId: string;
  let faultId: string;
  let memberName: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    const memberId = await userIdByEmail(USERS.member);
    clubId = await createClub("E2E Melderclub", ownerId);
    await addMember(clubId, memberId, "member");
    ({ machineId } = await createMachine({ ownerId, clubId, opdbRef: "E2E-MELD" }));
    faultId = await addFault({ machineId, beschreibung: "E2E Melderfehler", gemeldetVon: ownerId });
    memberName = (await sql`SELECT name FROM "user" WHERE id = ${memberId}`)[0].name as string;
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
    await sql`DELETE FROM role_assignments WHERE club_id = ${clubId}`;
    await sql`DELETE FROM clubs WHERE id = ${clubId}`;
  });

  test("auf ein Mitglied und dann auf einen Gast setzen", async ({ page }) => {
    await loginAs(page, USERS.owner);
    await page.goto(`/machines/${machineId}/faults/${faultId}/edit`);
    await page.getByLabel("Gemeldet von").selectOption({ label: memberName });
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);
    await page.goto(`/machines/${machineId}?bereich=fehler`);
    const zeile = page.getByRole("listitem").filter({ hasText: "E2E Melderfehler" });
    await expect(zeile).toContainText(memberName);

    await page.goto(`/machines/${machineId}/faults/${faultId}/edit`);
    await page.getByLabel("Gemeldet von").selectOption("gast");
    await page.getByLabel("Gast-Name").fill("Mr. X");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForURL((u) => u.pathname === `/machines/${machineId}`);
    await page.goto(`/machines/${machineId}?bereich=fehler`);
    await expect(
      page.getByRole("listitem").filter({ hasText: "E2E Melderfehler" }),
    ).toContainText("Mr. X (Gast)");
  });
});
