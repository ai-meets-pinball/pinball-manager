import { expect, test } from "@playwright/test";
import { sql } from "./helpers/db";
import { loginAs, USERS } from "./helpers/auth";

/*
  Einladungs-Rundmail (Super-Admin): Text in der App pflegen → die Vorschau
  zeigt ihn gerendert (Absätze, Links) → mehrere Adressen auf einmal einladen,
  jede mit eigenem Token. Ohne RESEND_API_KEY (so läuft die Suite, siehe
  playwright.config.ts) scheitert der Versand — die Einladung bleibt trotzdem
  gespeichert, genau das meldet die Ergebniszeile. Der Beleg ist die DB.
*/
const ADRESSEN = ["e2e-rundmail-1@e2e.local", "e2e-rundmail-2@e2e.local"];

test.describe("Einladungs-Rundmail", () => {
  test.afterAll(async () => {
    await sql`DELETE FROM invitations WHERE email = ANY(${ADRESSEN})`;
    // Vorlage wieder auf den Standardtext — andere Specs sehen sonst den Testtext.
    await sql`DELETE FROM email_templates WHERE key = 'invite_platform'`;
  });

  test("Text speichern → Vorschau; Adressen einladen → je Adresse eine Einladung", async ({
    page,
  }) => {
    await loginAs(page, USERS.admin);
    await page.goto("/admin/rundmail");
    await expect(page.getByRole("heading", { name: "Einladungs-Rundmail" })).toBeVisible();

    // 1 · Text ändern und speichern — Absatz + URL, beides muss die Vorschau rendern.
    // „Text" trifft auch „Persönliche Nachricht" — deshalb über den Feldnamen.
    const text = page.locator("textarea[name=body]");
    await text.fill(
      "Hallo von {{einlader}} — E2E-Rundmailtext.\n\nMehr unter https://example.org/einstieg.",
    );
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Vorlage gespeichert.")).toBeVisible();

    // 2 · Vorschau ist die gerenderte Mail (iframe): Platzhalter gefüllt, URL verlinkt.
    const vorschau = page.frameLocator('iframe[title="Vorschau der Einladungsmail"]');
    await expect(vorschau.getByText("E2E-Rundmailtext")).toBeVisible();
    await expect(
      vorschau.getByRole("link", { name: "https://example.org/einstieg" }),
    ).toHaveAttribute("href", "https://example.org/einstieg");
    await expect(vorschau.getByRole("link", { name: "Konto erstellen" })).toBeVisible();

    // 3 · Adressen (eine je Zeile, eine Ungültige dazu) — der Knopf fragt nach.
    await page.getByLabel("E-Mail-Adressen").fill(`${ADRESSEN[0]}\nkein-at\n${ADRESSEN[1]}`);
    await expect(page.getByText("2 gültige Adressen · 1 ungültig")).toBeVisible();
    await page.getByRole("button", { name: "Einladungen verschicken" }).click();
    await expect(page.getByText("2 Einladungen verschicken?")).toBeVisible();
    await page.getByRole("button", { name: "Ja, verschicken" }).click();

    // Ergebnis je Adresse: ohne Mail-Key gespeichert, aber nicht verschickt.
    const ergebnis = page.getByRole("status");
    await expect(ergebnis).toContainText(`${ADRESSEN[0]} — Einladung gespeichert, Versand fehlgeschlagen`);
    await expect(ergebnis).toContainText(`${ADRESSEN[1]} — Einladung gespeichert, Versand fehlgeschlagen`);
    await expect(ergebnis).toContainText("kein-at — ungültige Adresse");

    // DB: je Adresse EINE offene Plattform-Einladung mit eigenem 48-Hex-Token.
    const rows = await sql`
      SELECT email, token, status, club_id FROM invitations
      WHERE email = ANY(${ADRESSEN}) ORDER BY email`;
    expect(rows.map((r) => r.email)).toEqual(ADRESSEN);
    for (const r of rows) {
      expect(r.status).toBe("pending");
      expect(r.club_id).toBeNull();
      expect(r.token).toMatch(/^[0-9a-f]{48}$/);
    }
    expect(rows[0].token).not.toBe(rows[1].token);
  });
});
