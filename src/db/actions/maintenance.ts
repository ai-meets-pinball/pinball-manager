"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getFamilie } from "@/db/queries/familie";
import {
  knowledge,
  maintenanceLog,
  maintenancePlanItems,
  maintenancePlans,
  maintenanceTasks,
} from "@/db/schema";
import { isClubMember, requireMachineWrite } from "@/lib/session";
import { anzahl } from "@/lib/format";
import { resolvePrompt } from "@/db/queries";
import { naechsterTermin, wartungspunktGesperrt } from "@/lib/faelligkeit";
import { resolveProvider } from "@/lib/ai/provider";
import { AiError, generateJson, type AiAntwort } from "@/lib/ai/generate";
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
  // Vom Standard verwaltete Punkte werden IM Standard bearbeitet — dieselbe
  // Regel graut im UI den Stift aus (lib/faelligkeit.ts).
  const gesperrt = wartungspunktGesperrt(task);
  if (gesperrt) return { error: gesperrt };

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
      naechsteFaelligkeit: naechsterTermin(
        d.intervallTyp,
        d.intervallTage ?? null,
        ab,
      ),
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

export async function deleteTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const id = String(formData.get("id"));
  await requireMachineWrite(machineId);

  const task = await db.query.maintenanceTasks.findFirst({
    where: and(
      eq(maintenanceTasks.id, id),
      eq(maintenanceTasks.machineId, machineId),
    ),
  });
  if (!task) return { error: "Wartungspunkt nicht gefunden." };
  // Vom Standard verwaltete Punkte nicht einzeln löschen (nur via Standard oder
  // durch Lösen der Verknüpfung). Vorher ein stilles Nichtstun per WHERE.
  const gesperrt = wartungspunktGesperrt(task);
  if (gesperrt) return { error: gesperrt };

  await db
    .delete(maintenanceTasks)
    .where(
      and(
        eq(maintenanceTasks.id, id),
        eq(maintenanceTasks.machineId, machineId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
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
        naechsteFaelligkeit: naechsterTermin(
          task.intervallTyp,
          task.intervallTage,
          wann,
        ),
        // Nächster Zyklus darf wieder erinnern.
        zuletztErinnert: null,
      })
      .where(eq(maintenanceTasks.id, taskId));
  });

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}

/** Mehrere Wartungspunkte auf einmal erledigen (ein Datum/Notiz für alle) —
    dieselbe Log+Fälligkeits-Logik wie logCompletion, in EINER Transaktion über
    die maschinen-scoped Auswahl. */
export async function logCompletionBulk(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user } = await requireMachineWrite(machineId);

  const taskIds = formData.getAll("taskIds").map(String).filter(Boolean);
  if (taskIds.length === 0) {
    return { error: "Keine Wartungspunkte ausgewählt." };
  }

  const parsed = maintenanceLogSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;
  const datum = d.datum ? new Date(d.datum) : new Date();
  const wann = Number.isNaN(datum.getTime()) ? new Date() : datum;

  // Nur Punkte DIESER Maschine (Scope + wehrt fremde IDs ab).
  const tasks = await db.query.maintenanceTasks.findMany({
    where: and(
      eq(maintenanceTasks.machineId, machineId),
      inArray(maintenanceTasks.id, taskIds),
    ),
  });
  if (tasks.length === 0) return { error: "Wartungspunkt nicht gefunden." };

  await db.transaction(async (tx) => {
    for (const task of tasks) {
      await tx.insert(maintenanceLog).values({
        taskId: task.id,
        machineId,
        datum: wann,
        erledigtVon: user.id,
        notiz: d.notiz ?? null,
      });
      await tx
        .update(maintenanceTasks)
        .set({
          zuletztErledigt: wann,
          naechsteFaelligkeit: naechsterTermin(
            task.intervallTyp,
            task.intervallTage,
            wann,
          ),
          zuletztErinnert: null,
        })
        .where(eq(maintenanceTasks.id, task.id));
    }
  });

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}

/* Historien-Eintrag löschen — FormState statt void, damit der Papierkorb im
   Historie-Dialog (ActionForm + ConfirmButton) eine Ablehnung als Zeile zeigt. */
export async function deleteTaskLog(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
        naechsteFaelligkeit: naechsterTermin(
          task.intervallTyp,
          task.intervallTage,
          ab,
        ),
      })
      .where(eq(maintenanceTasks.id, taskId));
  }

  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}

/* ── Standard-Wartungsplan als KOPIE übernehmen ───────────────────────────── */
/* Quelle: der EIGENE Standard des Nutzers (maintenance_plans), falls vorhanden —
   sonst das Code-Template. Die Kopie ist danach frei editierbar (keine
   Verknüpfung; dafür gibt es linkMachineToStandard in maintenance-plans.ts). */

export async function applyStandardMaintenance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user } = await requireMachineWrite(machineId);
  const planId = String(formData.get("planId") ?? "");

  // Quelle = der GEWÄHLTE Plan (autorisiert: eigener Plan oder Club-Mitglied).
  const plan = planId
    ? await db.query.maintenancePlans.findFirst({
        where: eq(maintenancePlans.id, planId),
      })
    : null;
  const erlaubt =
    plan != null &&
    (plan.userId === user.id ||
      (plan.clubId ? await isClubMember(user.id, plan.clubId) : false));
  // Kein stilles Nichtstun: die Verweigerung erscheint unter dem Formular.
  if (!plan) return { error: "Wartungsplan nicht gefunden." };
  if (!erlaubt) return { error: "Kein Zugriff auf diesen Plan." };

  const vorhanden = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
    columns: { titel: true },
  });
  const haben = new Set(vorhanden.map((t) => t.titel.trim().toLowerCase()));

  const quelle = await db.query.maintenancePlanItems.findMany({
    where: eq(maintenancePlanItems.planId, planId),
  });

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
      naechsteFaelligkeit: naechsterTermin(
        e.intervallTyp,
        e.intervallTage,
        now,
      ),
    }));

  if (neu.length > 0) await db.insert(maintenanceTasks).values(neu);
  revalidatePath(`/machines/${machineId}`);
  // Das Formular bleibt stehen (die Maschine ist NICHT verknüpft) — also sagen,
  // was passiert ist; gleichnamige Punkte wurden übersprungen.
  return {
    message:
      neu.length === 0
        ? "Alle Punkte des Plans sind bereits vorhanden."
        : `${anzahl(neu.length, "Punkt", "Punkte")} als Kopie übernommen.`,
  };
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

/* Der Wartungs-Import-Systemprompt liegt jetzt in der Registry (lib/prompts.ts,
   key "maintenance_import") und wird per resolvePrompt aufgelöst. */

export async function importMaintenanceFromGuide(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user, machine } = await requireMachineWrite(machineId);

  // Datenmodell-Redesign (Phase 2): der Guide dieses Nutzers liegt als
  // Modell-Wissen (knowledge, typ='troubleshooting') vor — je nach Modell auf
  // Modell- (samt baugleicher Editionen) oder Maschinen-Ebene. `inhalt` ist der
  // Umschlag { guide, … }.
  const eintrag = await db.query.knowledge.findFirst({
    where: and(
      eq(knowledge.typ, "troubleshooting"),
      eq(knowledge.createdBy, user.id),
      machine.modelId
        ? inArray(knowledge.modelId, (await getFamilie(machine.modelId)).ids)
        : eq(knowledge.machineId, machineId),
    ),
  });
  if (!eintrag) {
    return {
      error: "Es gibt noch keinen Troubleshooting-Guide für dieses Gerät.",
    };
  }

  const umschlag = eintrag.inhalt as { guide?: unknown };
  const guide = troubleshootingGuideSchema.safeParse(umschlag?.guide);
  if (!guide.success)
    return { error: "Der Guide konnte nicht gelesen werden." };

  const abschnittText = serialisiereWartungsabschnitt(guide.data);
  if (!abschnittText) {
    return { error: "Der Guide enthält keinen Wartungsplan-Abschnitt." };
  }

  // Zwei Wege (siehe lib/ai/provider.ts): Claude (Standard) oder lokal via Ollama —
  // der Nutzer wählt je Aktion (Feld „provider"), sonst der Standard.
  const provider = resolveProvider(formData);
  const { text: system } = await resolvePrompt("maintenance_import");
  const userPrompt = `Wandle diesen Wartungsplan-Abschnitt in strukturierte Wartungspunkte (JSON) um:\n\n${abschnittText}`;

  let antwort: AiAntwort;
  try {
    antwort = await generateJson(provider, {
      system,
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
    return {
      error: "Die Antwort wurde abgeschnitten. Bitte erneut versuchen.",
    };
  }

  let punkte: ReturnType<typeof maintenanceImportSchema.parse>["punkte"];
  try {
    punkte = maintenanceImportSchema.parse(antwort.json).punkte;
  } catch (e) {
    console.error("[maintenance-import] parse:", (e as Error).message);
    return {
      error: "Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen.",
    };
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
      const tage =
        p.intervallTyp === "zeit" && p.intervallTage > 0
          ? p.intervallTage
          : null;
      return {
        machineId,
        titel: p.titel.trim(),
        kategorie: p.kategorie || null,
        bauteil: p.bauteil || null,
        taetigkeit: p.taetigkeit || null,
        beschreibung: p.beschreibung || null,
        prioritaet: p.prioritaet,
        intervallTyp: tage
          ? p.intervallTyp
          : p.intervallTyp === "zeit"
            ? "bedarf"
            : p.intervallTyp,
        intervallTage: tage,
        intervallText: null,
        naechsteFaelligkeit: naechsterTermin(p.intervallTyp, tage, now),
      };
    });

  if (neu.length > 0) await db.insert(maintenanceTasks).values(neu);
  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
