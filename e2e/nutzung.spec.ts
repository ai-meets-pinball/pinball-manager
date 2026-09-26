import { expect, test } from "@playwright/test";
import { createMachine, sql, userIdByEmail } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Nutzungsübersicht (/admin/nutzung, nur Super-Admins): die Anmeldung landet im
  Login-Log, der Seitenaufruf im Tages-Protokoll, die Reiter zeigen Nutzer,
  Clubs und den Ereignis-Feed — und wer kein Super-Admin ist, wird umgeleitet.
*/
test.describe("Nutzungsübersicht", () => {
  let machineId: string;
  let ownerName: string;

  test.beforeAll(async () => {
    const ownerId = await userIdByEmail(USERS.owner);
    ({ machineId } = await createMachine({
      ownerId,
      opdbRef: "E2E-NUTZ",
      modell: "E2E Nutzungsgerät",
    }));
    ownerName = (await sql`SELECT name FROM "user" WHERE id = ${ownerId}`)[0]
      .name as string;
  });

  test.afterAll(async () => {
    await sql`DELETE FROM machines WHERE id = ${machineId}`;
  });

  test("Anmeldung schreibt Login-Log und aktiven Tag", async ({ page }) => {
    const adminId = await userIdByEmail(USERS.admin);
    const [vorher] = await sql`
      SELECT count(*)::int n FROM login_log WHERE user_id = ${adminId}`;
    await loginAs(page, USERS.admin);
    const [nachher] = await sql`
      SELECT count(*)::int n FROM login_log WHERE user_id = ${adminId}`;
    expect(nachher.n).toBeGreaterThan(vorher.n);
    const [tag] = await sql`
      SELECT count(*)::int n FROM nutzung_tage
       WHERE user_id = ${adminId} AND tag = (now() at time zone 'utc')::date`;
    expect(tag.n).toBe(1);
  });

  test("Reiter Nutzer, Clubs und Aktivität", async ({ page }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/admin/nutzung?tab=nutzer&zeitraum=alle");
    await expect(page.getByRole("heading", { name: "Nutzung" })).toBeVisible();
    const zeile = page.getByRole("row", { name: new RegExp(ownerName) });
    await expect(zeile).toBeVisible();
    // Der Owner besitzt mindestens die eben angelegte Maschine.
    await expect(zeile).not.toContainText(/\s0\s+0\s+0\s+0/);

    await page.goto("/admin/nutzung?tab=clubs&zeitraum=alle");
    await expect(page.getByRole("columnheader", { name: "Mitglieder" })).toBeVisible();

    await page.goto("/admin/nutzung?tab=aktivitaet&zeitraum=alle&art=maschine");
    await expect(page.getByText("E2E Nutzungsgerät | E2E Werke").first()).toBeVisible();
    await expect(page.getByText("Maschine angelegt").first()).toBeVisible();
  });

  test("ohne Super-Admin-Rolle keine Nutzungsübersicht", async ({ page }) => {
    await loginAs(page, USERS.member);
    await page.goto("/admin/nutzung");
    await expect(page).toHaveURL(/\/machines/);
  });
});
