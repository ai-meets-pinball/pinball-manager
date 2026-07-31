"use server";

import { and, eq, notExists } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  clubs,
  machines,
  maintenanceLog,
  maintenancePlanItems,
  maintenancePlans,
  maintenanceTasks,
} from "@/db/schema";
import { MAINTENANCE_STANDARD } from "@/lib/maintenance-catalog";
import { computeDue } from "@/lib/maintenance-due";
import {
  isClubManager,
  isClubMember,
  requireMachineWrite,
  requireUser,
  type SessionUser,
} from "@/lib/session";
import { maintenanceTaskSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/clubs";

/*
  Standard-Wartungspläne (Vorlagen je Nutzer / je Club) und ihre PROPAGATION:
  Maschinen mit machines.maintenance_plan_id FOLGEN dem Standard — jede Änderung
  an einem Plan-Punkt wird auf die verknüpften Maschinen-Tasks gespiegelt
  (Task-Zeilen bleiben bestehen → Fälligkeit/Historie überleben Updates).

  Regeln:
  - Anlegen eines Punkts   → neuer Task auf allen verknüpften Maschinen.
  - Ändern eines Punkts    → Felder aller verknüpften Tasks aktualisieren,
                             Fälligkeit ab zuletztErledigt ?? createdAt neu.
  - Löschen eines Punkts   → Tasks OHNE Historie werden gelöscht; Tasks MIT
                             Historie koppeln ab (planItemId → null, „eigen"),
                             damit keine Wartungs-Historie vernichtet wird.
  - Standard bearbeiten darf: der Nutzer (eigener Plan) bzw. Club-Manager.
*/

/* ── Zugriff ──────────────────────────────────────────────────────────────── */

async function darfPlanBearbeiten(
  me: SessionUser,
  plan: { userId: string | null; clubId: string | null },
): Promise<boolean> {
  if (plan.userId) return plan.userId === me.id;
  if (plan.clubId) return isClubManager(me.id, plan.clubId);
  return false;
}

async function planOderFehler(planId: string) {
  const plan = await db.query.maintenancePlans.findFirst({
    where: eq(maintenancePlans.id, planId),
  });
  if (!plan) throw new Error("Wartungsplan nicht gefunden");
  return plan;
}

/* ── Standard anlegen (Seed aus dem Code-Template) ────────────────────────── */

async function seedItems(planId: string) {
  await db.insert(maintenancePlanItems).values(
    MAINTENANCE_STANDARD.map((e) => ({
      planId,
      titel: e.titel,
      kategorie: e.kategorie,
      bauteil: e.bauteil,
      taetigkeit: e.taetigkeit,
      beschreibung: e.beschreibung,
      prioritaet: e.prioritaet,
      intervallTyp: e.intervallTyp,
      intervallTage: e.intervallTage,
      intervallText: e.intervallText,
    })),
  );
}

/** Eigenen Standard (Nutzer) holen oder aus dem Template anlegen. */
export async function ensureUserStandard(): Promise<string> {
  const me = await requireUser();
  const vorhanden = await db.query.maintenancePlans.findFirst({
    where: eq(maintenancePlans.userId, me.id),
  });
  if (vorhanden) return vorhanden.id;
  const [plan] = await db
    .insert(maintenancePlans)
    .values({ name: "Mein Standard", userId: me.id })
    .returning({ id: maintenancePlans.id });
  await seedItems(plan.id);
  revalidatePath("/wartungsplaene");
  return plan.id;
}

/** Club-Standard holen oder anlegen (nur Club-Manager). */
export async function ensureClubStandard(clubId: string): Promise<string> {
  const me = await requireUser();
  if (!(await isClubManager(me.id, clubId))) {
    throw new Error("Nur Club-Manager dürfen den Club-Standard anlegen");
  }
  const vorhanden = await db.query.maintenancePlans.findFirst({
    where: eq(maintenancePlans.clubId, clubId),
  });
  if (vorhanden) return vorhanden.id;
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  const [plan] = await db
    .insert(maintenancePlans)
    .values({ name: `Standard ${club?.name ?? "Club"}`, clubId })
    .returning({ id: maintenancePlans.id });
  await seedItems(plan.id);
  revalidatePath("/wartungsplaene");
  return plan.id;
}

/** Formular-Wrapper: Standard anlegen (Nutzer oder Club). */
export async function createStandard(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  if (clubId) await ensureClubStandard(clubId);
  else await ensureUserStandard();
}

/* ── Punkte: CRUD mit Propagation ─────────────────────────────────────────── */

/** Felder eines Plan-Punkts aus dem Formular (dieselbe Validierung wie Tasks). */
function parseItem(formData: FormData) {
  return maintenanceTaskSchema.safeParse(Object.fromEntries(formData));
}

export async function createPlanItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const planId = String(formData.get("planId"));
  const plan = await planOderFehler(planId);
  if (!(await darfPlanBearbeiten(me, plan))) {
    return { error: "Keine Berechtigung für diesen Standard." };
  }
  const parsed = parseItem(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;

  const now = new Date();
  await db.transaction(async (tx) => {
    const [item] = await tx
      .insert(maintenancePlanItems)
      .values({
        planId,
        titel: d.titel,
        kategorie: d.kategorie ?? null,
        bauteil: d.bauteil ?? null,
        taetigkeit: d.taetigkeit ?? null,
        beschreibung: d.beschreibung ?? null,
        prioritaet: d.prioritaet,
        intervallTyp: d.intervallTyp,
        intervallTage: d.intervallTage ?? null,
        intervallText: d.intervallText ?? null,
      })
      .returning({ id: maintenancePlanItems.id });

    // Propagation: neuer Punkt auf allen verknüpften Maschinen.
    const verknuepft = await tx
      .select({ id: machines.id })
      .from(machines)
      .where(eq(machines.maintenancePlanId, planId));
    if (verknuepft.length > 0) {
      await tx.insert(maintenanceTasks).values(
        verknuepft.map((m) => ({
          machineId: m.id,
          planItemId: item.id,
          titel: d.titel,
          kategorie: d.kategorie ?? null,
          bauteil: d.bauteil ?? null,
          taetigkeit: d.taetigkeit ?? null,
          beschreibung: d.beschreibung ?? null,
          prioritaet: d.prioritaet,
          intervallTyp: d.intervallTyp,
          intervallTage: d.intervallTage ?? null,
          intervallText: d.intervallText ?? null,
          naechsteFaelligkeit: computeDue(d.intervallTyp, d.intervallTage ?? null, now),
        })),
      );
    }
    await tx
      .update(maintenancePlans)
      .set({ updatedAt: now })
      .where(eq(maintenancePlans.id, planId));
  });

  revalidatePath("/wartungsplaene");
  return { message: "Punkt angelegt." };
}

export async function updatePlanItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const itemId = String(formData.get("itemId"));
  const item = await db.query.maintenancePlanItems.findFirst({
    where: eq(maintenancePlanItems.id, itemId),
  });
  if (!item) return { error: "Punkt nicht gefunden." };
  const plan = await planOderFehler(item.planId);
  if (!(await darfPlanBearbeiten(me, plan))) {
    return { error: "Keine Berechtigung für diesen Standard." };
  }
  const parsed = parseItem(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;
  const felder = {
    titel: d.titel,
    kategorie: d.kategorie ?? null,
    bauteil: d.bauteil ?? null,
    taetigkeit: d.taetigkeit ?? null,
    beschreibung: d.beschreibung ?? null,
    prioritaet: d.prioritaet,
    intervallTyp: d.intervallTyp,
    intervallTage: d.intervallTage ?? null,
    intervallText: d.intervallText ?? null,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(maintenancePlanItems)
      .set(felder)
      .where(eq(maintenancePlanItems.id, itemId));

    // Propagation: Felder aller verknüpften Tasks nachziehen; Fälligkeit ab
    // letzter Erledigung (bzw. Anlage) neu berechnen — Historie bleibt.
    const tasks = await tx
      .select({
        id: maintenanceTasks.id,
        zuletztErledigt: maintenanceTasks.zuletztErledigt,
        createdAt: maintenanceTasks.createdAt,
      })
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.planItemId, itemId));
    for (const t of tasks) {
      await tx
        .update(maintenanceTasks)
        .set({
          ...felder,
          naechsteFaelligkeit: computeDue(
            d.intervallTyp,
            d.intervallTage ?? null,
            t.zuletztErledigt ?? t.createdAt,
          ),
        })
        .where(eq(maintenanceTasks.id, t.id));
    }
    await tx
      .update(maintenancePlans)
      .set({ updatedAt: new Date() })
      .where(eq(maintenancePlans.id, item.planId));
  });

  revalidatePath("/wartungsplaene");
  return { message: "Gespeichert — auf verknüpfte Maschinen übertragen." };
}

export async function deletePlanItem(formData: FormData): Promise<void> {
  const me = await requireUser();
  const itemId = String(formData.get("itemId"));
  const item = await db.query.maintenancePlanItems.findFirst({
    where: eq(maintenancePlanItems.id, itemId),
  });
  if (!item) return;
  const plan = await planOderFehler(item.planId);
  if (!(await darfPlanBearbeiten(me, plan))) return;

  await db.transaction(async (tx) => {
    // Tasks OHNE Historie mitlöschen; Tasks MIT Historie überleben und werden
    // durch das FK-SET-NULL beim Item-Delete automatisch zu eigenen Punkten.
    await tx.delete(maintenanceTasks).where(
      and(
        eq(maintenanceTasks.planItemId, itemId),
        notExists(
          tx
            .select({ id: maintenanceLog.id })
            .from(maintenanceLog)
            .where(eq(maintenanceLog.taskId, maintenanceTasks.id)),
        ),
      ),
    );
    await tx
      .delete(maintenancePlanItems)
      .where(eq(maintenancePlanItems.id, itemId));
    await tx
      .update(maintenancePlans)
      .set({ updatedAt: new Date() })
      .where(eq(maintenancePlans.id, item.planId));
  });

  revalidatePath("/wartungsplaene");
}

/* ── Maschine ↔ Standard ──────────────────────────────────────────────────── */

const zielSchema = z.union([z.literal("user"), z.string().uuid()]);

/** Maschine mit einem Standard verknüpfen ("user" = mein Standard, sonst
    Club-id — nur Clubs, in denen ich Mitglied bin). Bestehende Punkte mit
    gleichem Titel werden an den Standard gekoppelt (Historie bleibt), fehlende
    ergänzt; zusätzliche eigene Punkte bleiben eigene Punkte. */
export async function linkMachineToStandard(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const machineId = String(formData.get("machineId"));
  const { user: me } = await requireMachineWrite(machineId);

  const ziel = zielSchema.safeParse(formData.get("ziel"));
  if (!ziel.success) return { error: "Ungültiges Ziel." };

  let planId: string;
  if (ziel.data === "user") {
    planId = await ensureUserStandard();
  } else {
    if (!(await isClubMember(me.id, ziel.data))) {
      return { error: "Du bist kein Mitglied dieses Clubs." };
    }
    // Mitglieder dürfen verknüpfen; anlegen darf nur der Manager.
    const vorhanden = await db.query.maintenancePlans.findFirst({
      where: eq(maintenancePlans.clubId, ziel.data),
    });
    if (vorhanden) planId = vorhanden.id;
    else if (await isClubManager(me.id, ziel.data))
      planId = await ensureClubStandard(ziel.data);
    else
      return {
        error: "Dieser Club hat noch keinen Standard — ein Club-Manager muss ihn anlegen.",
      };
  }

  const items = await db.query.maintenancePlanItems.findMany({
    where: eq(maintenancePlanItems.planId, planId),
  });
  const tasks = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.machineId, machineId),
  });
  const nachTitel = new Map(tasks.map((t) => [t.titel.trim().toLowerCase(), t]));

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const item of items) {
      const felder = {
        titel: item.titel,
        kategorie: item.kategorie,
        bauteil: item.bauteil,
        taetigkeit: item.taetigkeit,
        beschreibung: item.beschreibung,
        prioritaet: item.prioritaet,
        intervallTyp: item.intervallTyp,
        intervallTage: item.intervallTage,
        intervallText: item.intervallText,
      };
      const bestehend = nachTitel.get(item.titel.trim().toLowerCase());
      if (bestehend) {
        await tx
          .update(maintenanceTasks)
          .set({
            ...felder,
            planItemId: item.id,
            naechsteFaelligkeit: computeDue(
              item.intervallTyp,
              item.intervallTage,
              bestehend.zuletztErledigt ?? bestehend.createdAt,
            ),
          })
          .where(eq(maintenanceTasks.id, bestehend.id));
      } else {
        await tx.insert(maintenanceTasks).values({
          machineId,
          planItemId: item.id,
          ...felder,
          naechsteFaelligkeit: computeDue(item.intervallTyp, item.intervallTage, now),
        });
      }
    }
    await tx
      .update(machines)
      .set({ maintenancePlanId: planId })
      .where(eq(machines.id, machineId));
  });

  revalidatePath(`/machines/${machineId}`);
  return { message: "Mit Standard verknüpft." };
}

/** Verknüpfung lösen: alle Punkte werden eigene, frei editierbare Kopien. */
export async function unlinkMachineFromStandard(
  formData: FormData,
): Promise<void> {
  const machineId = String(formData.get("machineId"));
  await requireMachineWrite(machineId);

  await db.transaction(async (tx) => {
    await tx
      .update(maintenanceTasks)
      .set({ planItemId: null })
      .where(eq(maintenanceTasks.machineId, machineId));
    await tx
      .update(machines)
      .set({ maintenancePlanId: null })
      .where(eq(machines.id, machineId));
  });

  revalidatePath(`/machines/${machineId}`);
}
