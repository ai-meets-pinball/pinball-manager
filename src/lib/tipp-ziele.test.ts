import { describe, expect, it } from "vitest";
import { ordneTippZiele } from "./tipp-ziele";

const pro = { id: "pro", label: "King Kong (Pro)", opdbRef: "GKK1-Mpro" };
const premium = { id: "prem", label: "King Kong (Premium)", opdbRef: "GKK1-Mprem" };
const le = { id: "le", label: "King Kong (LE)", opdbRef: "GKK1-Mle-Ale" };
const twilight = { id: "tz", label: "Twilight Zone", opdbRef: "GTZ1-Mtz" };
const handeingabe = { id: "hand", label: "Eigenbau", opdbRef: null };

describe("ordneTippZiele", () => {
  it("trennt dieses Gerät, Editionen desselben Titels und alle anderen", () => {
    const r = ordneTippZiele([pro, premium, le, twilight, handeingabe], pro);
    expect(r.eigenes).toBe(pro);
    expect(r.editionen).toEqual([premium, le]);
    expect(r.andere).toEqual([twilight, handeingabe]);
  });

  it("kennt ohne OPDB-Referenz keine Editionen — alles andere ist „andere“", () => {
    const r = ordneTippZiele([pro, premium, handeingabe], handeingabe);
    expect(r.eigenes).toBe(handeingabe);
    expect(r.editionen).toEqual([]);
    expect(r.andere).toEqual([pro, premium]);
  });

  it("liefert eigenes = null, wenn das Modell nicht im Katalog ist", () => {
    const r = ordneTippZiele([twilight], pro);
    expect(r.eigenes).toBeNull();
    expect(r.andere).toEqual([twilight]);
  });

  it("gibt bei leerem Katalog leere Listen zurück", () => {
    expect(ordneTippZiele([], pro)).toEqual({ eigenes: null, editionen: [], andere: [] });
  });
});
