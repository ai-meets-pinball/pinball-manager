import { expect, test } from "@playwright/test";

/*
  Hilfe: der Einstieg ist öffentlich, die Zielgruppen-Wahl zeigt genau EINEN
  Weg, und das PDF-Handbuch kommt als echtes PDF (mit dem Einstieg als erstem
  Kapitel — inhaltlich nicht prüfbar, aber der Content-Type schon).
*/
test.describe("Hilfe & Einstieg", () => {
  test("Einstieg lädt als Gast und zeigt die gewählte Zielgruppe", async ({ page }) => {
    await page.goto("/help/einstieg");
    await expect(page.getByRole("heading", { name: "Einstieg" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Worum es geht" })).toBeVisible();
    // Standard: Solo-Sammler:in
    await expect(page.getByRole("heading", { name: "Für Solo-Sammler:innen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Für Club-Owner und -Admins" })).toHaveCount(0);

    await page.getByRole("tab", { name: "Club-Owner / -Admin" }).click();
    await expect(page).toHaveURL(/ich=owner/);
    await expect(page.getByRole("heading", { name: "Für Club-Owner und -Admins" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Für Solo-Sammler:innen" })).toHaveCount(0);

    // Für alle: KI, Tiefer einsteigen, Feedback.
    await expect(page.getByRole("heading", { name: "Die KI, ehrlich erklärt" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Tiefer einsteigen/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Probleme melden & mitgestalten" })).toBeVisible();
  });

  test("Anleitung verlinkt den Einstieg; Reiter „Einstieg“ steht vorn", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("link", { name: "Einstieg" }).first()).toBeVisible();
    // Schritt-Titel sind keine Überschriften — nur der Sektionskopf ist eine.
    await expect(page.getByText(/^Zugang auf Einladung\./)).toBeVisible();
  });

  test("Suche filtert die Anleitung und verweist auf den Einstieg", async ({ page }) => {
    await page.goto("/help");
    const suche = page.getByRole("textbox", { name: "In der Hilfe suchen" });
    await suche.fill("Sammel-QR");
    await suche.press("Enter");
    await expect(page).toHaveURL(/q=Sammel-QR/);
    // Nur Sektionen mit Treffer bleiben: „Fehler" (Sammel-QR-Schritt) ja,
    // „Erste Schritte" nicht.
    await expect(page.getByRole("heading", { name: "Fehler" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Erste Schritte" })).toHaveCount(0);
    // Treffer in anderen Hilfe-Seiten als Links.
    await expect(page.getByRole("link", { name: /^Einstieg: / }).first()).toBeVisible();

    await page.goto("/help?q=gibtsganzsichernicht");
    await expect(page.getByText(/Nichts gefunden zu/)).toBeVisible();
    await page.getByRole("link", { name: "zurücksetzen" }).click();
    await expect(page.getByRole("heading", { name: "Erste Schritte" })).toBeVisible();
  });

  test("PDF-Handbuch antwortet als PDF", async ({ request }) => {
    const res = await request.get("/help/manual");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    expect((await res.body()).length).toBeGreaterThan(10_000);
  });
});
