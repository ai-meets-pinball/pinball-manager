"use server";

import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  maintenanceLog,
  maintenanceTasks,
  troubleshootingGuides,
} from "@/db/schema";
import { requireMachineWrite } from "@/lib/session";
import { MAINTENANCE_STANDARD } from "@/lib/maintenance-catalog";
import {
  maintenanceImportJsonSchema,
  maintenanceImportSchema,
  maintenanceLogSchema,
  maintenanceTaskSchema,
  troubleshootingGuideSchema,
} from "@/lib/validators";

export type FormState = { error?: string; ok?: boolean };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/* ── Fälligkeits-Helfer ────────────────────────────────────────────────────
   Nur zeitbasierte Intervalle ergeben einen Termin (naechsteFaelligkeit). */
function addDays(base: Date, tage: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + tage);
  return d;
}
function computeDue(
  intervallTyp: string,
  intervallTage: number | null,
  ab: Date,
): Date | null {
  return intervallTyp === "zeit" && intervallTage && intervallTage > 0
    ? addDays(ab, intervallTage)
    : null;
}

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
    naechsteFaelligkeit: computeDue(
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
      naechsteFaelligkeit: computeDue(d.intervallTyp, d.intervallTage ?? null, ab),
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

  await db
    .delete(maintenanceTasks)
    .where(
      and(
        eq(maintenanceTasks.id, id),
        eq(maintenanceTasks.machineId, machineId),
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
        naechsteFaelligkeit: computeDue(task.intervallTyp, task.intervallTage, wann),
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
        naechsteFaelligkeit: computeDue(task.intervallTyp, task.intervallTage, ab),
      })
      .where(eq(maintenanceTasks.id, taskId));
  }

  revalidatePath(`/machines/${machineId}`);
}

/* ── Standard-Wartungsplan (Timms Liste) übernehmen ───────────────────────── */

export async function applyStandardMaintenance(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  await requireMachineWrite(machineId);

  const vorhanden = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
    columns: { titel: true },
  });
  const haben = new Set(vorhanden.map((t) => t.titel.trim().toLowerCase()));

  const now = new Date();
  const neu = MAINTENANCE_STANDARD.filter(
    (e) => !haben.has(e.titel.trim().toLowerCase()),
  ).map((e) => ({
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
    naechsteFaelligkeit: computeDue(e.intervallTyp, e.intervallTage, now),
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
  await requireMachineWrite(machineId);

  const guideRow = await db.query.troubleshootingGuides.findFirst({
    where: eq(troubleshootingGuides.machineId, machineId),
  });
  if (!guideRow) {
    return { error: "Es gibt noch keinen Troubleshooting-Guide für dieses Gerät." };
  }

  const guide = troubleshootingGuideSchema.safeParse(guideRow.daten);
  if (!guide.success) return { error: "Der Guide konnte nicht gelesen werden." };

  const abschnittText = serialisiereWartungsabschnitt(guide.data);
  if (!abschnittText) {
    return { error: "Der Guide enthält keinen Wartungsplan-Abschnitt." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "Import ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt)." };
  }

  let text: string;
  try {
    const client = new Anthropic({ apiKey, maxRetries: 4 });
    const res = await client.messages
      .stream({
        model: MODEL,
        max_tokens: 8000,
        system: IMPORT_SYSTEM,
        output_config: {
          format: { type: "json_schema", schema: maintenanceImportJsonSchema },
        },
        messages: [
          {
            role: "user",
            content: `Wandle diesen Wartungsplan-Abschnitt in strukturierte Wartungspunkte (JSON) um:\n\n${abschnittText}`,
          },
        ],
      })
      .finalMessage();

    if (res.stop_reason === "refusal") return { error: "Die Verarbeitung wurde abgelehnt." };
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return { error: "Es konnten keine Wartungspunkte extrahiert werden." };
    }
    text = block.text;
  } catch (e) {
    console.error("[maintenance-import] API:", (e as Error).message);
    return { error: "Import fehlgeschlagen. Bitte später erneut versuchen." };
  }

  let punkte: ReturnType<typeof maintenanceImportSchema.parse>["punkte"];
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
    punkte = maintenanceImportSchema.parse(JSON.parse(json)).punkte;
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
        naechsteFaelligkeit: computeDue(p.intervallTyp, tage, now),
      };
    });

  if (neu.length > 0) await db.insert(maintenanceTasks).values(neu);
  revalidatePath(`/machines/${machineId}`);
  return { ok: true };
}
