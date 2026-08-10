import { describe, expect, it } from "vitest";
import { AiError, generateJson, sliceJson } from "@/lib/ai/generate";
import type { AiAdapter, AiRohantwort } from "@/lib/ai/types";

/*
  Der Anbieter-Seam ohne Anbieter: `generateJson` nimmt den Adapter als
  Parameter, also lassen sich hier genau die Zustände prüfen, für die vorher
  ein echtes Modell (und Glück) nötig war — Ablehnung, Abschneiden bei
  max_tokens, pausierte Websuche, unbrauchbare Antwort.
*/
const skript = (roh: Partial<AiRohantwort>): AiAdapter => {
  return async () => ({
    text: "",
    model: "test-modell",
    ende: "fertig",
    ...roh,
  });
};

const anfrage = { prompt: "egal", schema: {} };

describe("generateJson", () => {
  it("gibt geparstes JSON zurück", async () => {
    const a = await generateJson(
      "anthropic",
      anfrage,
      skript({ text: '{"a":1}' }),
    );
    expect(a.json).toEqual({ a: 1 });
    expect(a.abgeschnitten).toBe(false);
    expect(a.model).toBe("test-modell");
  });

  it("löst JSON aus umrahmendem Text", async () => {
    const a = await generateJson(
      "ollama",
      anfrage,
      skript({ text: 'Klar! Hier:\n```json\n{"a":1}\n```\nViel Erfolg!' }),
    );
    expect(a.json).toEqual({ a: 1 });
  });

  it("wirft bei Ablehnung", async () => {
    await expect(
      generateJson("anthropic", anfrage, skript({ ende: "abgelehnt" })),
    ).rejects.toMatchObject({ art: "abgelehnt" });
  });

  it("wirft, wenn die Websuche nicht fertig wird", async () => {
    await expect(
      generateJson("anthropic", anfrage, skript({ ende: "pausiert" })),
    ).rejects.toBeInstanceOf(AiError);
  });

  it("meldet Abschneiden als Wert, nicht als Fehler", async () => {
    // Absicht: die Extraktion überspringt so ein Paket und behält den Rest,
    // der Guide bricht ab. Diese Entscheidung gehört dem Aufrufer.
    const a = await generateJson(
      "anthropic",
      anfrage,
      skript({ ende: "abgeschnitten", text: '{"unvoll' }),
    );
    expect(a.abgeschnitten).toBe(true);
    expect(a.json).toBeNull();
  });

  it("wirft bei unbrauchbarer Antwort — unterscheidbar von einem API-Fehler", async () => {
    // Der Unterschied trägt: manual-extract überspringt ein unbrauchbares
    // Paket, bricht aber bei „nicht-erreichbar" den ganzen Lauf ab.
    await expect(
      generateJson("mlx", anfrage, skript({ text: "gar kein JSON" })),
    ).rejects.toMatchObject({ art: "ungueltige-antwort" });
  });

  it("reicht durch, ob wirklich im Web gesucht wurde", async () => {
    const mit = await generateJson(
      "anthropic",
      anfrage,
      skript({ text: "{}", websucheGenutzt: true }),
    );
    const ohne = await generateJson("ollama", anfrage, skript({ text: "{}" }));
    expect(mit.websucheGenutzt).toBe(true);
    expect(ohne.websucheGenutzt).toBe(false);
  });

  it("lässt Fehler des Adapters unverändert durch", async () => {
    const kaputt: AiAdapter = async () => {
      throw new AiError("nicht-erreichbar", "Ollama nicht erreichbar.");
    };
    await expect(
      generateJson("ollama", anfrage, kaputt),
    ).rejects.toMatchObject({
      art: "nicht-erreichbar",
      userMessage: "Ollama nicht erreichbar.",
    });
  });
});

describe("sliceJson", () => {
  it("schneidet auf das äußerste Objekt zu", () => {
    expect(sliceJson('vorher {"a":{"b":1}} nachher')).toBe('{"a":{"b":1}}');
  });

  it("lässt reines JSON unverändert", () => {
    expect(sliceJson('{"a":1}')).toBe('{"a":1}');
  });

  it("gibt den Eingabetext zurück, wenn es nichts zu schneiden gibt", () => {
    expect(sliceJson("kein json")).toBe("kein json");
    expect(sliceJson("}{")).toBe("}{");
  });
});
