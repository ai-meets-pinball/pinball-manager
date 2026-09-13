import { describe, expect, it } from "vitest";
import { darfEigenenSchluessel, darfKi, KI_GRUND_BETREIBER } from "./ki-zugang";

const gast = null;
const nutzer = { id: "u1", roles: ["user"] };
const superAdmin = { id: "u2", roles: ["superadmin"] };

describe("darfKi", () => {
  it("erlaubt den Reparaturvorschlag jedem — auch ohne Rollen", () => {
    expect(darfKi(gast, "reparatur")).toEqual({ erlaubt: true });
    expect(darfKi(nutzer, "reparatur")).toEqual({ erlaubt: true });
    expect(darfKi({ id: "u3" }, "reparatur")).toEqual({ erlaubt: true });
  });

  it.each(["handbuch", "guide", "wartung"] as const)(
    "behält %s dem Super-Admin vor und nennt den Grund",
    (zweck) => {
      expect(darfKi(superAdmin, zweck)).toEqual({ erlaubt: true });
      expect(darfKi(nutzer, zweck)).toEqual({ erlaubt: false, grund: KI_GRUND_BETREIBER });
      expect(darfKi(gast, zweck)).toEqual({ erlaubt: false, grund: KI_GRUND_BETREIBER });
    },
  );
});

describe("darfKi mit abgeschalteter KI in der App", () => {
  it("sperrt den Super-Admin GENAU wie einen Nutzer — gleicher Wortlaut, kein Sonderhinweis", () => {
    expect(darfKi(superAdmin, "guide", false)).toEqual(darfKi(nutzer, "guide"));
    expect(darfKi(superAdmin, "guide", false)).toEqual({
      erlaubt: false,
      grund: KI_GRUND_BETREIBER,
    });
    expect(darfKi(superAdmin, "reparatur", false)).toEqual({ erlaubt: true });
  });

  it("ändert für Nutzer nichts — die Einstellung wirkt nur beim Super-Admin", () => {
    expect(darfKi(nutzer, "guide", false)).toEqual({ erlaubt: false, grund: KI_GRUND_BETREIBER });
    expect(darfKi(nutzer, "guide", true)).toEqual({ erlaubt: false, grund: KI_GRUND_BETREIBER });
  });
});

describe("darfEigenenSchluessel", () => {
  it("nur der Super-Admin — und nur mit KI in der App", () => {
    expect(darfEigenenSchluessel(superAdmin)).toBe(true);
    expect(darfEigenenSchluessel(superAdmin, false)).toBe(false);
    expect(darfEigenenSchluessel(nutzer)).toBe(false);
    expect(darfEigenenSchluessel(gast)).toBe(false);
  });
});
