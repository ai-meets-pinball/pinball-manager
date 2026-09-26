import { describe, expect, it } from "vitest";
import { geraetetyp } from "@/lib/geraetetyp";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1";
const MAC_FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0";
const WIN_EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0";

describe("geraetetyp", () => {
  it("erkennt iPhone mit Safari als Handy", () => {
    expect(geraetetyp(IPHONE)).toBe("Handy · Safari");
  });

  it("erkennt Android mit Chrome als Handy (Chrome vor Safari)", () => {
    expect(geraetetyp(ANDROID)).toBe("Handy · Chrome");
  });

  it("erkennt iPad als Tablet", () => {
    expect(geraetetyp(IPAD)).toBe("Tablet · Chrome");
  });

  it("erkennt Desktop-Browser und Edge vor Chrome", () => {
    expect(geraetetyp(MAC_FIREFOX)).toBe("Desktop · Firefox");
    expect(geraetetyp(WIN_EDGE)).toBe("Desktop · Edge");
  });

  it("liefert null ohne User-Agent und rät keinen Browser", () => {
    expect(geraetetyp(null)).toBeNull();
    expect(geraetetyp("   ")).toBeNull();
    expect(geraetetyp("curl/8.4.0")).toBe("Desktop");
  });
});
