"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  knowledge,
  knowledgeOverrides,
  knowledgeRevisions,
  knowledgeSignals,
} from "@/db/schema";
import { getKnowledgeRevisions, knowledgeSichtbarFuer } from "@/db/queries";
import { parseFactsText } from "@/lib/import-facts";
import { darfWissen } from "@/lib/rechte";
import {
  kannKuratieren,
  requireUser,
  requireWissenZugriff,
} from "@/lib/session";
import { FACT_TYPES, troubleshootingGuideSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Datenmodell-Redesign (Phase 1): Sichtbarkeit eines Wissenseintrags ändern.
  Das ersetzt das frühere „Fakten teilen" — die Sichtbarkeit ist jetzt eine
  Eigenschaft des Eintrags (privat|club|oeffentlich), nicht ein separates Share.
  Nur der Autor (oder Super-Admin) darf sie ändern. „club" behält den bestehenden
  Club-Anker; ein Club-Picker kommt später (Phase 5) — der Control bietet vorerst
  privat/öffentlich.
*/
export async function setKnowledgeVisibility(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const v = String(formData.get("visibility") ?? "");
  if (v !== "privat" && v !== "club" && v !== "oeffentlich") {
    return { error: "Ungültige Sichtbarkeit." };
  }

  const zugriff = await requireWissenZugriff(id);
  if (!zugriff) return { error: "Wissenseintrag nicht gefunden." };
  if (!zugriff.darf.bearbeiten) {
    return { error: "Nur der Autor darf die Sichtbarkeit ändern." };
  }

  await db
    .update(knowledge)
    .set(
      v === "club"
        ? { visibility: v, updatedAt: new Date() } // Club-Anker unverändert lassen
        : { visibility: v, clubId: null, updatedAt: new Date() },
    )
    .where(eq(knowledge.id, id));

  if (machineId) revalidatePath(`/machines/${machineId}`);
  return { message: "Sichtbarkeit geändert." };
}

/*
  Persönliches Ausblenden (Phase 5): einen fremden, sichtbaren Wissenseintrag
  für sich ausblenden bzw. wieder einblenden. Rein persönlich — ändert nichts für
  andere. Den eigenen Eintrag blendet man nicht aus (Verwaltung via Sichtbarkeit).
*/
export async function setKnowledgeOverride(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const hide = String(formData.get("hide") ?? "") === "true";
  const currentUser = await requireUser();

  const [k] = await db
    .select({ createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k) return;
  if (k.createdBy === currentUser.id) return; // eigenen Eintrag nicht ausblenden
  if (!(await knowledgeSichtbarFuer(currentUser, id))) return;

  if (hide) {
    await db
      .insert(knowledgeOverrides)
      .values({ knowledgeId: id, userId: currentUser.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(knowledgeOverrides)
      .where(
        and(
          eq(knowledgeOverrides.knowledgeId, id),
          eq(knowledgeOverrides.userId, currentUser.id),
        ),
      );
  }

  if (machineId) revalidatePath(`/machines/${machineId}`);
}

/*
  In-Place-Bearbeitung (Phase 5): Titel + Inhalt eines EIGENEN Wissenseintrags
  ändern — die id bleibt stabil (Signale/Overrides überleben), der alte Stand
  wird vorher als Revision gesichert. Der Inhalt kommt als JSON-Text und wird je
  Typ autoritativ validiert: Fakten über `parseFactsText` (dieselbe Prüfung
  wie beim Import), Guides über `troubleshootingGuideSchema` — dabei bleibt der
  Umschlag (websuche, model) des bestehenden Eintrags erhalten. `sourceType` und
  Sichtbarkeit ändert ein Edit bewusst nicht.
*/
export async function updateKnowledge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const titel = String(formData.get("titel") ?? "").trim();
  const inhaltText = String(formData.get("inhalt") ?? "");
  const kommentar = String(formData.get("kommentar") ?? "").trim();

  const currentUser = await requireUser();
  const [k] = await db
    .select({
      typ: knowledge.typ,
      titel: knowledge.titel,
      inhalt: knowledge.inhalt,
      createdBy: knowledge.createdBy,
    })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k) return { error: "Wissenseintrag nicht gefunden." };
  if (!darfWissen(currentUser, k).bearbeiten) {
    return { error: "Nur der Autor darf den Eintrag bearbeiten." };
  }
  if (!titel) return { error: "Titel ist erforderlich." };

  let inhalt: unknown;
  if (k.typ === "handbuch_fakten") {
    const parsed = parseFactsText(inhaltText);
    if (!parsed.ok || !parsed.result) {
      return { error: parsed.errors[0] ?? "Ungültige Fakten-Struktur." };
    }
    // Wie beim Import/Extrakt: nur die vorhandenen (nicht-leeren) Typen speichern.
    const result = parsed.result;
    inhalt = Object.fromEntries(
      FACT_TYPES.filter((t) => result[t].rows.length > 0).map((t) => [
        t,
        result[t],
      ]),
    );
  } else if (k.typ === "troubleshooting") {
    let roh: unknown;
    try {
      roh = JSON.parse(inhaltText);
    } catch {
      return { error: "Kein gültiges JSON." };
    }
    const parsed = troubleshootingGuideSchema.safeParse(roh);
    if (!parsed.success) {
      return {
        error: `Ungültige Guide-Struktur: ${parsed.error.issues[0]?.message ?? "unbekannt"}`,
      };
    }
    // Umschlag (websuche, model) des bestehenden Eintrags erhalten.
    const umschlag =
      k.inhalt && typeof k.inhalt === "object"
        ? (k.inhalt as Record<string, unknown>)
        : {};
    inhalt = { ...umschlag, guide: parsed.data };
  } else {
    return { error: "Dieser Eintragstyp ist nicht bearbeitbar." };
  }

  await db.transaction(async (tx) => {
    await tx.insert(knowledgeRevisions).values({
      knowledgeId: id,
      titel: k.titel,
      inhalt: k.inhalt,
      editedBy: currentUser.id,
      kommentar: kommentar || null,
    });
    await tx
      .update(knowledge)
      .set({ titel, inhalt, updatedAt: new Date() })
      .where(eq(knowledge.id, id));
  });

  if (machineId) revalidatePath(`/machines/${machineId}`);
  return { message: "Eintrag gespeichert." };
}

/** Verlauf eines Wissenseintrags — nur für den Autor (oder Super-Admin): alte
    Stände können aus Zeiten anderer Sichtbarkeit stammen und gehören nicht in
    fremde Hände. Lazy-Datenlader für den Verlauf-Aufklapper. */
export async function loadKnowledgeRevisions(knowledgeId: string) {
  // Das Autor-Gate trägt die Abfrage selbst (db/queries.ts) — hier bleibt nur
  // die Anmeldung, damit ein nicht angemeldeter Aufruf auf /login landet.
  return getKnowledgeRevisions(await requireUser(), knowledgeId);
}

/*
  Kuratoren-Moderation: einen geteilten Wissenseintrag FÜR ALLE verbergen — nur
  mit Begründung, reversibel (restoreKnowledge). Der Autor sowie Kuratoren und
  Super-Admins sehen den Eintrag weiterhin, markiert samt Grund (kein stilles
  Zensieren). Die Melde-Warnung bleibt davon unabhängig rein anzeigend.
*/
export async function hideKnowledge(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const grund = String(formData.get("grund") ?? "").trim();

  const currentUser = await requireUser();
  if (!kannKuratieren(currentUser)) {
    return { error: "Nur Kuratoren dürfen Einträge verbergen." };
  }
  if (!grund) return { error: "Eine Begründung ist erforderlich." };
  if (!(await knowledgeSichtbarFuer(currentUser, id))) {
    return { error: "Wissenseintrag nicht gefunden." };
  }

  await db
    .update(knowledge)
    // updatedAt bewusst unangetastet — Verbergen ist keine inhaltliche Änderung
    // und soll die Sortierung nicht verschieben.
    .set({ verborgenAm: new Date(), verborgenVon: currentUser.id, verborgenGrund: grund })
    .where(eq(knowledge.id, id));

  if (machineId) revalidatePath(`/machines/${machineId}`);
  revalidatePath("/kuratierung");
  return { message: "Eintrag verborgen." };
}

/** Einen verborgenen Wissenseintrag wiederherstellen (Kurator/Super-Admin). */
export async function restoreKnowledge(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const machineId = String(formData.get("machineId") ?? "");

  const currentUser = await requireUser();
  // Kein stilles Nichtstun: wer nicht darf, bekommt einen Fehler statt eines
  // Formulars, das scheinbar funktioniert hat.
  if (!kannKuratieren(currentUser)) {
    throw new Error("Nur Kuratoren dürfen Einträge wiederherstellen");
  }
  if (!(await knowledgeSichtbarFuer(currentUser, id))) {
    throw new Error("Wissenseintrag nicht gefunden");
  }

  await db
    .update(knowledge)
    .set({ verborgenAm: null, verborgenVon: null, verborgenGrund: null })
    .where(eq(knowledge.id, id));

  if (machineId) revalidatePath(`/machines/${machineId}`);
  revalidatePath("/kuratierung");
}

/*
  Community-Signal (Phase 5): einen Wissenseintrag als „hilfreich" oder „falsch"
  markieren. Genau ein Signal je Nutzer und Eintrag; `wert='aus'` entfernt es.
  Man signalisiert nur, was man sehen darf, und nicht den EIGENEN Eintrag.
*/
export async function setKnowledgeSignal(formData: FormData): Promise<void> {
  const id = String(formData.get("knowledgeId") ?? "");
  const wert = String(formData.get("wert") ?? "");
  const machineId = String(formData.get("machineId") ?? "");
  const currentUser = await requireUser();

  const [k] = await db
    .select({ createdBy: knowledge.createdBy })
    .from(knowledge)
    .where(eq(knowledge.id, id))
    .limit(1);
  if (!k) return;
  if (k.createdBy === currentUser.id) return; // eigenen Eintrag nicht bewerten
  if (!(await knowledgeSichtbarFuer(currentUser, id))) return;

  if (wert === "hilfreich" || wert === "falsch") {
    await db
      .insert(knowledgeSignals)
      .values({ knowledgeId: id, userId: currentUser.id, wert })
      .onConflictDoUpdate({
        target: [knowledgeSignals.knowledgeId, knowledgeSignals.userId],
        set: { wert },
      });
  } else {
    await db
      .delete(knowledgeSignals)
      .where(
        and(
          eq(knowledgeSignals.knowledgeId, id),
          eq(knowledgeSignals.userId, currentUser.id),
        ),
      );
  }

  if (machineId) revalidatePath(`/machines/${machineId}`);
}
