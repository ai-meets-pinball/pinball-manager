import { describe, expect, it } from "vitest";
import {
  clubRang,
  darfClub,
  darfMaschine,
  darfWissen,
  istLetzterOwner,
  mindestens,
} from "@/lib/rechte";

/*
  Die Rechtematrix als Tabelle. Vorher steckte jede dieser Regeln hinter
  headers() und dem db-Singleton — prüfbar nur, indem Playwright einen Browser
  startet, sich anmeldet und auf einen fehlenden Knopf schaut.
*/
const nutzer = (id: string, ...roles: string[]) => ({ id, roles });

const ich = nutzer("u1");
const fremder = nutzer("u2");
const superAdmin = nutzer("u3", "superadmin");
const supporter = nutzer("u4", "supporter");
const kurator = nutzer("u5", "kurator");

const privat = { ownerId: "u1", clubId: null };
const clubMaschine = { ownerId: "u1", clubId: "c1" };

describe("darfMaschine", () => {
  it("gibt dem Eigentümer alles", () => {
    expect(darfMaschine(ich, privat, null)).toEqual({
      lesen: true,
      bearbeiten: true,
      loeschen: true,
      teilen: true,
    });
  });

  it("sperrt Fremde vollständig aus", () => {
    expect(darfMaschine(fremder, privat, null)).toEqual({
      lesen: false,
      bearbeiten: false,
      loeschen: false,
      teilen: false,
    });
  });

  it("lässt ein Club-Mitglied lesen und bearbeiten, aber nicht löschen", () => {
    const d = darfMaschine(fremder, clubMaschine, "member");
    expect(d.lesen).toBe(true);
    expect(d.bearbeiten).toBe(true);
    expect(d.loeschen).toBe(false);
    expect(d.teilen).toBe(false);
  });

  it("gibt Club-Admins und -Owners auch das Löschen", () => {
    expect(darfMaschine(fremder, clubMaschine, "admin").loeschen).toBe(true);
    expect(darfMaschine(fremder, clubMaschine, "owner").loeschen).toBe(true);
  });

  it("lässt Supporter Club-Maschinen NUR lesen", () => {
    const d = darfMaschine(supporter, clubMaschine, null);
    expect(d.lesen).toBe(true);
    expect(d.bearbeiten).toBe(false);
    expect(d.loeschen).toBe(false);
  });

  it("hält Supporter von PRIVATEN Maschinen fern", () => {
    // Die Regel, die private Sammlungen schützt: ohne Club kein Supporter-Blick.
    expect(darfMaschine(supporter, privat, null).lesen).toBe(false);
  });

  it("gibt dem Super-Admin alles, auch bei fremden Privatmaschinen", () => {
    expect(darfMaschine(superAdmin, privat, null)).toEqual({
      lesen: true,
      bearbeiten: true,
      loeschen: true,
      teilen: true,
    });
  });

  it("macht aus einer Club-Rolle ohne Club keine Rechte", () => {
    // clubId = null: eine mitgegebene Rolle darf nicht durchschlagen.
    expect(darfMaschine(fremder, privat, "owner").lesen).toBe(false);
  });
});

describe("darfWissen", () => {
  it("lässt nur den Autor bearbeiten", () => {
    expect(darfWissen(ich, { createdBy: "u1" }).bearbeiten).toBe(true);
    expect(darfWissen(fremder, { createdBy: "u1" }).bearbeiten).toBe(false);
  });

  it("lässt den Super-Admin fremde Einträge bearbeiten", () => {
    expect(darfWissen(superAdmin, { createdBy: "u1" }).bearbeiten).toBe(true);
  });

  it("trennt Kuratieren vom Bearbeiten", () => {
    const k = darfWissen(kurator, { createdBy: "u1" });
    expect(k.kuratieren).toBe(true);
    expect(k.bearbeiten).toBe(false);
    expect(darfWissen(ich, { createdBy: "u1" }).kuratieren).toBe(false);
  });
});

describe("darfClub", () => {
  it("staffelt Mitglied, Admin und Owner", () => {
    expect(darfClub(fremder, "member")).toEqual({
      lesen: true,
      verwalten: false,
      ownerVergeben: false,
    });
    expect(darfClub(fremder, "admin")).toEqual({
      lesen: true,
      verwalten: true,
      ownerVergeben: false,
    });
    expect(darfClub(fremder, "owner")).toEqual({
      lesen: true,
      verwalten: true,
      ownerVergeben: true,
    });
  });

  it("lässt Supporter lesen, aber nicht verwalten", () => {
    expect(darfClub(supporter, null)).toEqual({
      lesen: true,
      verwalten: false,
      ownerVergeben: false,
    });
  });

  it("sperrt Nichtmitglieder aus", () => {
    expect(darfClub(fremder, null).lesen).toBe(false);
  });
});

describe("Rollenrang", () => {
  it("ordnet Owner über Admin über Mitglied über nichts", () => {
    expect(clubRang("owner")).toBeGreaterThan(clubRang("admin"));
    expect(clubRang("admin")).toBeGreaterThan(clubRang("member"));
    expect(clubRang("member")).toBeGreaterThan(clubRang(null));
    expect(clubRang("erfunden")).toBe(0);
  });

  it("beantwortet „mindestens“ ohne Aufzählung", () => {
    expect(mindestens("owner", "admin")).toBe(true);
    expect(mindestens("member", "admin")).toBe(false);
    expect(mindestens(null, "member")).toBe(false);
  });
});

describe("istLetzterOwner", () => {
  it("schützt den letzten Owner eines Clubs", () => {
    expect(istLetzterOwner("owner", 1)).toBe(true);
    expect(istLetzterOwner("owner", 2)).toBe(false);
    expect(istLetzterOwner("admin", 1)).toBe(false);
    expect(istLetzterOwner(null, 0)).toBe(false);
  });
});
