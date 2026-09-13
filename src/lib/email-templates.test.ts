import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, escapeHtml, textToHtml } from "./email-templates";

describe("textToHtml", () => {
  it("macht Leerzeilen zu Absätzen und einfache Umbrüche zu <br>", () => {
    expect(textToHtml("Eins\nzwei\n\nDrei")).toBe("<p>Eins<br>zwei</p>\n<p>Drei</p>");
  });

  it("escaped HTML — Vorlagen sind reiner Text", () => {
    expect(textToHtml("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>");
    expect(escapeHtml('a & "b"')).toContain("&amp;");
  });

  it("verlinkt https-URLs — auch mit Query, ohne den Satzpunkt mitzunehmen", () => {
    const html = textToHtml("Einstieg: https://pinball-manager.silverballmania.com/help/einstieg?ich=owner.");
    expect(html).toContain(
      '<a href="https://pinball-manager.silverballmania.com/help/einstieg?ich=owner" rel="noopener noreferrer">https://pinball-manager.silverballmania.com/help/einstieg?ich=owner</a>.',
    );
  });

  it("verlinkt nur http(s), nie javascript: oder eingeschmuggeltes Markup", () => {
    expect(textToHtml("javascript:alert(1)")).not.toContain("<a ");
    const html = textToHtml('https://x.de/"><script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("DEFAULT_TEMPLATES.invite_platform", () => {
  it("trägt den Onboarding-Text mit {{einlader}} und den Einstiegs-Links", () => {
    const t = DEFAULT_TEMPLATES.invite_platform;
    expect(t.body).toContain("{{einlader}}");
    expect(t.body).toContain("/help/einstieg");
    // Kein Markdown — die Mail ist Klartext.
    expect(t.body).not.toMatch(/\*\*/);
    expect(t.body).not.toMatch(/\[[^\]]+\]\(/);
  });
});
