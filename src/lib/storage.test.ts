import { describe, expect, it } from "vitest";
import { svgVerletzung } from "@/lib/storage";

/*
  Die Denylist hinter dem Club-Logo-SVG-Upload (uploadClubLogo). Sichert, dass
  aktive/gefährliche Inhalte abgelehnt werden und ein schlichtes Logo-SVG
  durchkommt. `svgVerletzung` liefert das verletzte Muster (truthy) oder null.
*/
describe("svgVerletzung (Club-Logo-SVG-Filter)", () => {
  const boese = [
    ["<svg><script>alert(1)</script></svg>", "script"],
    ['<svg onload="alert(1)"></svg>', "event-handler"],
    ['<svg><image href="javascript:alert(1)"/></svg>', "javascript:"],
    [
      "<svg><foreignObject><body>x</body></foreignObject></svg>",
      "foreignObject",
    ],
    [
      '<svg><use href="#x" xlink:href="data:image/svg+xml,.."/></svg>',
      "use href",
    ],
    [
      '<svg><animate attributeName="href" to="javascript:alert(1)"/></svg>',
      "animate",
    ],
    ['<!DOCTYPE svg [<!ENTITY x "y">]><svg/>', "doctype/entity"],
    [
      '<svg><a href="data:text/html,<script>1</script>">x</a></svg>',
      "data:text/html",
    ],
    ["<svg><style>@import url(evil.css)</style></svg>", "@import"],
    ['<svg><iframe src="//evil"></iframe></svg>', "iframe"],
  ] as const;

  for (const [svg, was] of boese) {
    it(`lehnt ${was} ab`, () => {
      expect(svgVerletzung(svg)).not.toBeNull();
    });
  }

  it("lässt ein schlichtes Logo-SVG durch", () => {
    const ok =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="40" fill="#7a1f2b"/>' +
      '<text x="50" y="55" text-anchor="middle" fill="#fff">PB</text></svg>';
    expect(svgVerletzung(ok)).toBeNull();
  });
});
