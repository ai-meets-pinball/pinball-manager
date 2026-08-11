"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  knowledge,
  maintenanceLog,
  maintenancePlanItems,
  maintenancePlans,
  maintenanceTasks,
} from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { naechsterTermin } from "@/lib/faelligkeit";
import { resolveProvider } from "@/lib/ai/provider";
import { AiError, generateJson, type AiAntwort } from "@/lib/ai/generate";
import { MAINTENANCE_STANDARD } from "@/lib/maintenance-catalog";
import {
  maintenanceImportJsonSchema,
  maintenanceImportSchema,
  maintenanceLogSchema,
  maintenanceTaskSchema,
  troubleshootingGuideSchema,
} from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";


/* Fälligkeits-Helfer liegt in lib/faelligkeit.ts (rein) — auch von
   db/actions/maintenance-plans.ts (Standard-Propagation) genutzt. */

/* ── Wartungspunkte: Anlegen / Bearbeiten / Löschen ───────────────────────── */

export async function createTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  await requireMachineWrite(machineId);

  const parsed = maintenanceTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;

  await db.insert(maintenanceTasks).values({
    machineId,
    titel: d.titel,
    kategorie: d.kategorie ?? null,
    bauteil: d.bauteil ?? null,
    taetigkeit: d.taetigkeit ?? null,
    beschreibung: d.beschreibung ?? null,
    prioritaet: d.prioritaet,
    intervallTyp: d.intervallTyp,
    intervallTage: d.intervallTage ?? null,
    intervallText: d.intervallText ?? null,
    // Erstfälligkeit ab jetzt (noch nie erledigt).
    naechsteFaelligkeit: naechsterTermin(
      d.intervallTyp,
      d.intervallTage ?? null,
      new Date(),
    ),
  });

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function updateTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const parsed = maintenanceTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;

  const task = await db.query.maintenanceTasks.findFirst({
    where: and(
      eq(maintenanceTasks.id, id),
      eq(maintenanceTasks.machineId, machineId),
    ),
  });
  if (!task) return { error: "Wartungspunkt nicht gefunden." };
  // Vom Standard verwaltete Punkte werden IM Standard bearbeitet
  // (db/actions/maintenance-plans.ts) — oder die Maschine löst die Verknüpfung.
  if (task.planItemId) {
    return {
      error:
        "Dieser Punkt wird vom Standard verwaltet — im Standard bearbeiten oder die Verknüpfung lösen.",
    };
  }

  // Fälligkeit ab letzter Erledigung (oder Anlagedatum), damit ein geändertes
  // Intervall sofort den nächsten Termin setzt.
  const ab = task.zuletztErledigt ?? task.createdAt;

  await db
    .update(maintenanceTasks)
    .set({
      titel: d.titel,
      kategorie: d.kategorie ?? null,
      bauteil: d.bauteil ?? null,
      taetigkeit: d.taetigkeit ?? null,
      beschreibung: d.beschreibung ?? null,
      prioritaet: d.prioritaet,
      intervallTyp: d.intervallTyp,
      intervallTage: d.intervallTage ?? null,
      intervallText: d.intervallText ?? null,
      naechsteFaelligkeit: naechsterTermin(d.intervallTyp, d.intervallTage ?? null, ab),
    })
    .where(
      and(
        eq(maintenanceTasks.id, id),
        eq(maintenanceTasks.machineId, machineId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
  redirect(`/machines/${machineId}`);
}

export async function deleteTask(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  // Vom Standard verwaltete Punkte nicht einzeln löschen (nur via Standard
  // oder durch Lösen der Verknüpfung) — planItemId muss NULL sein.
  await db
    .delete(maintenanceTasks)
    .where(
      and(
        eq(maintenanceTasks.id, id),
        eq(maintenanceTasks.machineId, machineId),
        isNull(maintenanceTasks.planItemId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
}

/* ── Erledigung (Historie) ────────────────────────────────────────────────── */

export async function logCompletion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const taskId = String(formData.get("taskId"));
  const { user } = await requireMachineWrite(machineId);

  const parsed = maintenanceLogSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;

  const task = await db.query.maintenanceTasks.findFirst({
    where: and(
      eq(maintenanceTasks.id, taskId),
      eq(maintenanceTasks.machineId, machineId),
    ),
  });
  if (!task) return { error: "Wartungspunkt nicht gefunden." };

  // Datum aus dem Date-Input (yyyy-mm-dd); leer = heute. Ungültiges → heute.
  const datum = d.datum ? new Date(d.datum) : new Date();
  const wann = Number.isNaN(datum.getTime()) ? new Date() : datum;

  await db.transaction(async (tx) => {
    await tx.insert(maintenanceLog).values({
      taskId,
      machineId,
      datum: wann,
      erledigtVon: user.id,
      notiz: d.notiz ?? null,
    });
    await tx
      .update(maintenanceTasks)
      .set({
        zuletztErledigt: wann,
        naechsteFaelligkeit: naechsterTermin(task.intervallTyp, task.intervallTage, wann),
        // Nächster Zyklus darf wieder erinnern.
        zuletztErinnert: null,
      })
      .where(eq(maintenanceTasks.id, taskId));
  });

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}

export async function deleteTaskLog(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const logId = String(formData.get("logId"));
  const taskId = String(formData.get("taskId"));
  await requireMachineWrite(machineId);

  await db
    .delete(maintenanceLog)
    .where(
      and(
        eq(maintenanceLog.id, logId),
        eq(maintenanceLog.machineId, machineId),
      ),
    );

  // Denormalisierte Felder aus der verbleibenden Historie neu ableiten.
  const task = await db.query.maintenanceTasks.findFirst({
    where: eq(maintenanceTasks.id, taskId),
  });
  if (task) {
    const [letzte] = await db
      .select({ datum: maintenanceLog.datum })
      .from(maintenanceLog)
      .where(eq(maintenanceLog.taskId, taskId))
      .orderBy(desc(maintenanceLog.datum))
      .limit(1);
    const ab = letzte?.datum ?? task.createdAt;
    await db
      .update(maintenanceTasks)
      .set({
        zuletztErledigt: letzte?.datum ?? null,
        naechsteFaelligkeit: naechsterTermin(task.intervallTyp, task.intervallTage, ab),
      })
      .where(eq(maintenanceTasks.id, taskId));
  }

  revalidatePath(`/machines/${machineId}`);
}

/* ── Standard-Wartungsplan als KOPIE übernehmen ───────────────────────────── */
/* Quelle: der EIGENE Standard des Nutzers (maintenance_plans), falls vorhanden —
   sonst das Code-Template. Die Kopie ist danach frei editierbar (keine
   Verknüpfung; dafür gibt es linkMachineToStandard in maintenance-plans.ts). */

export async function applyStandardMaintenance(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const { user } = await requireMachineWrite(machineId);

  const vorhanden = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
    columns: { titel: true },
  });
  const haben = new Set(vorhanden.map((t) => t.titel.trim().toLowerCase()));

  // Eigener Standard als Quelle, sonst das Code-Template.
  const eigenerPlan = await db.query.maintenancePlans.findFirst({
    where: eq(maintenancePlans.userId, user.id),
  });
  const quelle = eigenerPlan
    ? await db.query.maintenancePlanItems.findMany({
        where: eq(maintenancePlanItems.planId, eigenerPlan.id),
      })
    : MAINTENANCE_STANDARD;

  const now = new Date();
  const neu = quelle
    .filter((e) => !haben.has(e.titel.trim().toLowerCase()))
    .map((e) => ({
      machineId,
      titel: e.titel,
      kategorie: e.kategorie,
      bauteil: e.bauteil,
      taetigkeit: e.taetigkeit,
      beschreibung: e.beschreibung,
      prioritaet: e.prioritaet,
      intervallTyp: e.intervallTyp,
      intervallTage: e.intervallTage,
      intervallText: e.intervallText,
      naechsteFaelligkeit: naechsterTermin(e.intervallTyp, e.intervallTage, now),
    }));

  if (neu.length > 0) await db.insert(maintenanceTasks).values(neu);
  revalidatePath(`/machines/${machineId}`);
}

/* ── Wartungspunkte aus dem Troubleshooting-Guide extrahieren (Claude) ─────── */

/** Den Wartungsplan-Abschnitt des Guides zu Text verdichten (Vorlage für Claude). */
function serialisiereWartungsabschnitt(
  guide: ReturnType<typeof troubleshootingGuideSchema.parse>,
): string | null {
  const abschnitt = guide.abschnitte.find((a) => /wartung/i.test(a.titel));
  if (!abschnitt) return null;
  const zeilen: string[] = [];
  for (const b of abschnitt.bloecke) {
    if (b.typ === "text" || b.typ === "warnung") zeilen.push(b.text);
    else if (b.typ === "tabelle") {
      if (b.titel) zeilen.push(b.titel);
      zeilen.push(b.spalten.join(" | "));
      for (const r of b.zeilen) zeilen.push(r.join(" | "));
    }
  }
  const text = zeilen.join("\n").trim();
  return text.length > 0 ? text : null;
}

const IMPORT_SYSTEM = `Du bist ein erfahrener Flipper-Wartungs-Techniker. Du bekommst den Wartungsplan-Abschnitt eines Troubleshooting-Guides und wandelst ihn in strukturierte, einzelne Wartungspunkte um.
Je Punkt: titel (kurz, prägnant), kategorie (z. B. Mechanik/Elektrik/Reinigung/Verschleiß/Elektronik/Beleuchtung), bauteil, taetigkeit (Prüfen/Reinigen/Ersetzen/Testen/Schmieren …), intervallTyp ("zeit" wenn ein Zeitintervall genannt ist, sonst "spiele" bei einer Spielzahl, sonst "bedarf"), intervallTage (Anzahl Tage NUR bei intervallTyp "zeit"; sonst 0), prioritaet, beschreibung (ein Satz).
Nur echte, abhakbare Wartungspunkte — keine Erklärtexte, keine Sicherheitshinweise, keine Duplikate.`;

export async function importMaintenanceFromGuide(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user, machine } = await requireMachineWrite(machineId);

  // Datenmodell-Redesign (Phase 2): der Guide dieses Nutzers liegt als
  // Modell-Wissen (knowledge, typ='troubleshooting') vor — je nach Modell auf
  // Modell- oder Maschinen-Ebene. `inhalt` ist der Umschlag { guide, … }.
  const eintrag = await db.query.knowledge.findFirst({
    where: and(
      eq(knowledge.typ, "troubleshooting"),
      eq(knowledge.createdBy, user.id),
      machine.modelId
        ? eq(knowledge.modelId, machine.modelId)
        : eq(knowledge.machineId, machineId),
    ),
  });
  if (!eintrag) {
    return { error: "Es gibt noch keinen Troubleshooting-Guide für dieses Gerät." };
  }

  const umschlag = eintrag.inhalt as { guide?: unknown };
  const guide = troubleshootingGuideSchema.safeParse(umschlag?.guide);
  if (!guide.success) return { error: "Der Guide konnte nicht gelesen werden." };

  const abschnittText = serialisiereWartungsabschnitt(guide.data);
  if (!abschnittText) {
    return { error: "Der Guide enthält keinen Wartungsplan-Abschnitt." };
  }

  // Zwei Wege (siehe lib/ai/provider.ts): Claude (Standard) oder lokal via Ollama —
  // der Nutzer wählt je Aktion (Feld „provider"), sonst der Standard.
  const provider = resolveProvider(formData);
  const userPrompt = `Wandle diesen Wartungsplan-Abschnitt in strukturierte Wartungspunkte (JSON) um:\n\n${abschnittText}`;

  let antwort: AiAntwort;
  try {
    antwort = await generateJson(provider, {
      system: IMPORT_SYSTEM,
      prompt: userPrompt,
      schema: maintenanceImportJsonSchema,
      apiKey: String(formData.get("apiKey") ?? ""),
      zweck: "Import",
    });
  } catch (e) {
    console.error("[maintenance-import]", (e as Error).message);
    if (e instanceof AiError) return { error: e.userMessage };
    throw e;
  }

  if (antwort.abgeschnitten) {
    return { error: "Die Antwort wurde abgeschnitten. Bitte erneut versuchen." };
  }

  let punkte: ReturnType<typeof maintenanceImportSchema.parse>["punkte"];
  try {
    punkte = maintenanceImportSchema.parse(antwort.json).punkte;
  } catch (e) {
    console.error("[maintenance-import] parse:", (e as Error).message);
    return { error: "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen." };
  }

  const vorhanden = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
    columns: { titel: true },
  });
  const haben = new Set(vorhanden.map((t) => t.titel.trim().toLowerCase()));

  const now = new Date();
  const neu = punkte
    .filter((p) => p.titel.trim() && !haben.has(p.titel.trim().toLowerCase()))
    .map((p) => {
      const tage = p.intervallTyp === "zeit" && p.intervallTage > 0 ? p.intervallTage : null;
      return {
        machineId,
        titel: p.titel.trim(),
        kategorie: p.kategorie || null,
        bauteil: p.bauteil || null,
        taetigkeit: p.taetigkeit || null,
        beschreibung: p.beschreibung || null,
        prioritaet: p.prioritaet,
        intervallTyp: tage ? p.intervallTyp : p.intervallTyp === "zeit" ? "bedarf" : p.intervallTyp,
        intervallTage: tage,
        intervallText: null,
        naechsteFaelligkeit: naechsterTermin(p.intervallTyp, tage, now),
      };
    });

  if (neu.length > 0) await db.insert(maintenanceTasks).values(neu);
  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
