import { expect, request, test } from "@playwright/test";
import { BASE_URL, loginAs, USERS } from "./helpers/auth";

/*
  Hilfe & Handbuch: die Anleitung deckt die neuen Funktionen ab, die Admin-
  Hilfe (/help/admin) ist rollen-gefiltert (Kuratoren sehen nur die Kuratierung,
  Super-Admins alles), und das PDF-Handbuch (/help/manual) liefert nur
  angemeldet ein echtes PDF.
*/
test.describe("Hilfe & Handbuch", () => {
  test("Anleitung zeigt neue Sektionen samt Inhaltsverzeichnis — ohne Admin-Tab", async ({
    page,
  }) => {
    await loginAs(page, USERS.member);
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { name: "Anleitung & How-To" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Wissensbasis (Modelle)" }),
    ).toBeVisible();
    // Interaktives Inhaltsverzeichnis springt zur Sektion.
    await page
      .getByRole("link", { name: /Wissenseinträge bearbeiten/ })
      .click();
    await expect(page).toHaveURL(/#eintrag-bearbeiten/);
    // Kein Administration-Tab für normale Mitglieder.
    await expect(
      page.getByRole("link", { name: "Administration" }),
    ).toHaveCount(0);
  });

  test("Admin-Hilfe: Mitglied wird umgeleitet", async ({ page }) => {
    await loginAs(page, USERS.member);
    await page.goto("/help/admin");
    await page.waitForURL("**/help");
    await expect(
      page.getByRole("heading", { name: "Anleitung & How-To" }),
    ).toBeVisible();
  });

  test("Admin-Hilfe: Kurator sieht nur die Kuratierung", async ({ page }) => {
    await loginAs(page, USERS.kurator);
    await page.goto("/help/admin");
    await expect(
      page.getByRole("heading", { name: "Kuratierung", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nutzer & globale Rollen" }),
    ).toHaveCount(0);
  });

  test("Admin-Hilfe: Super-Admin sieht alle Sektionen und alle Tabs", async ({
    page,
  }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/help/admin");
    await expect(
      page.getByRole("heading", { name: "Nutzer & globale Rollen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Aufbau & Betrieb" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Anleitung" })).toBeVisible();
  });

  test("Handbuch-Download liefert angemeldet ein PDF", async ({ page }) => {
    await loginAs(page, USERS.member);
    const res = await page.request.get("/help/manual");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const body = await res.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("Handbuch-Download ohne Anmeldung: öffentlich (nur Anleitung)", async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    try {
      const res = await ctx.get("/help/manual");
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("application/pdf");
      const body = await res.body();
      expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    } finally {
      await ctx.dispose();
    }
  });

  test("Anleitung ist öffentlich (ohne Login); interne Tabs fehlen", async ({
    page,
  }) => {
    // Frischer, NICHT angemeldeter Kontext (kein loginAs).
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { name: "Anleitung & How-To" }),
    ).toBeVisible();
    // Gäste sehen weder den Techstack- noch die Admin-/Betriebs-Tabs.
    await expect(page.getByRole("link", { name: "Techstack" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Administration" }),
    ).toHaveCount(0);
  });
});
