"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { repairs, shareTargets, shares, user } from "@/db/schema";
import { isClubMember, requireMachineAccess } from "@/lib/session";
import { SHARE_SCOPES, type ShareScope } from "@/lib/sharing";
import type { FormState } from "@/db/actions/clubs";

/*
  Freigaben anlegen/ändern/aufheben. Der Bezugspunkt ist immer der GERÄTETYP
  (machines.modelId) — nur so findet ein anderer Besitzer desselben Automaten
  das Wissen wieder. Maschinen ohne OPDB-Bezug haben keinen Typ und können
  deshalb (noch) nicht teilen.
*/

const schema = z.object({
  machineId: z.string().uuid(),
  scope: z.enum(SHARE_SCOPES),
  anonym: z.string().optional(), // Checkbox: "on" | undefined
  zeigeKosten: z.string().optional(), // Checkbox
  clubIds: z.string().optional(), // kommaseparierte Club-UUIDs
  emails: z.string().optional(), // kommaseparierte E-Mails
});

/*
  Ziele auflösen, BEVOR geschrieben wird — sonst entstünde eine Freigabe ohne
  Empfänger, die stillschweigend niemanden erreicht. Prüft außerdem, dass man
  nur mit eigenen Clubs teilt und dass alle genannten Konten existieren.
*/
async function zieleAufloesen(
  userId: string,
  scope: ShareScope,
  data: { clubIds?: string; emails?: string },
): Promise<{ clubIds: string[]; userIds: string[] } | { error: string }> {
  const clubIds = (data.clubIds ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const emails = (data.emails ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (scope === "club") {
    if (clubIds.length === 0) return { error: "Bitte mindestens einen Club wählen." };
    for (const clubId of clubIds) {
      if (!(await isClubMember(userId, clubId))) {
        return { error: "Du kannst nur mit Clubs teilen, in denen du Mitglied bist." };
      }
    }
    return { clubIds, userIds: [] };
  }

  if (scope === "users") {
    if (emails.length === 0) return { error: "Bitte mindestens eine E-Mail angeben." };
    const gefunden = await db.query.user.findMany({
      where: inArray(user.email, emails),
      columns: { id: true, email: true },
    });
    const fehlend = emails.filter(
      (e) => !gefunden.some((g) => g.email.toLowerCase() === e),
    );
    if (fehlend.length > 0) {
      return { error: `Kein Konto gefunden für: ${fehlend.join(", ")}` };
    }
    return { clubIds: [], userIds: gefunden.map((g) => g.id) };
  }

  return { clubIds: [], userIds: [] }; // platform
}

/** Handbuch-Fakten einer Maschine teilen (oder Reichweite ändern). */
export async function shareFacts(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const { machineId, scope } = parsed.data;

  // Autorisierung + Berechtigungsstufe aus der einen Regel.
  const { user: currentUser, machine, darf } =
    await requireMachineAccess(machineId);
  if (!darf.teilen) {
    return { error: "Nur Eigentümer oder Club-Manager dürfen teilen." };
  }
  if (!machine.modelId) {
    return {
      error:
        "Diese Maschine hat keinen OPDB-Bezug — ohne Gerätetyp lässt sich nichts teilen.",
    };
  }

  const ziele = await zieleAufloesen(currentUser.id, scope, parsed.data);
  if ("error" in ziele) return ziele;

  await db.transaction(async (tx) => {
    const [share] = await tx
      .insert(shares)
      .values({
        artefaktTyp: "machine_facts",
        artefaktId: machineId,
        modelId: machine.modelId!,
        ownerId: currentUser.id,
        scope,
        anonym: parsed.data.anonym === "on",
      })
      .onConflictDoUpdate({
        target: [shares.artefaktTyp, shares.artefaktId],
        set: { scope, anonym: parsed.data.anonym === "on" },
      })
      .returning({ id: shares.id });

    // Ziele immer neu setzen (Reichweite kann gewechselt haben).
    await tx.delete(shareTargets).where(eq(shareTargets.shareId, share.id));
    if (ziele.clubIds.length > 0) {
      await tx
        .insert(shareTargets)
        .values(ziele.clubIds.map((clubId) => ({ shareId: share.id, clubId })));
    }
    if (ziele.userIds.length > 0) {
      await tx
        .insert(shareTargets)
        .values(ziele.userIds.map((userId) => ({ shareId: share.id, userId })));
    }
  });

  revalidatePath(`/machines/${machineId}`);
  return { message: "Handbuch-Daten geteilt." };
}

/** Eine Reparatur teilen (oder Reichweite/Felder ändern). */
export async function shareRepair(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const repairId = String(formData.get("repairId"));
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const { machineId, scope } = parsed.data;

  const { user: currentUser, machine, darf } =
    await requireMachineAccess(machineId);
  if (!darf.teilen) {
    return { error: "Nur Eigentümer oder Club-Manager dürfen teilen." };
  }
  if (!machine.modelId) {
    return {
      error:
        "Diese Maschine hat keinen OPDB-Bezug — ohne Gerätetyp lässt sich nichts teilen.",
    };
  }

  // Die Reparatur muss zu DIESER Maschine gehören — sonst könnte man über eine
  // eigene Maschine fremde Reparaturen freigeben.
  const reparatur = await db.query.repairs.findFirst({
    where: and(eq(repairs.id, repairId), eq(repairs.machineId, machineId)),
  });
  if (!reparatur) return { error: "Reparatur nicht gefunden." };

  const ziele = await zieleAufloesen(currentUser.id, scope, parsed.data);
  if ("error" in ziele) return ziele;

  await db.transaction(async (tx) => {
    const [share] = await tx
      .insert(shares)
      .values({
        artefaktTyp: "repair",
        artefaktId: repairId,
        modelId: machine.modelId!,
        ownerId: currentUser.id,
        scope,
        anonym: parsed.data.anonym === "on",
        zeigeKosten: parsed.data.zeigeKosten === "on",
      })
      .onConflictDoUpdate({
        target: [shares.artefaktTyp, shares.artefaktId],
        set: {
          scope,
          anonym: parsed.data.anonym === "on",
          zeigeKosten: parsed.data.zeigeKosten === "on",
        },
      })
      .returning({ id: shares.id });

    await tx.delete(shareTargets).where(eq(shareTargets.shareId, share.id));
    if (ziele.clubIds.length > 0) {
      await tx
        .insert(shareTargets)
        .values(ziele.clubIds.map((clubId) => ({ shareId: share.id, clubId })));
    }
    if (ziele.userIds.length > 0) {
      await tx
        .insert(shareTargets)
        .values(ziele.userIds.map((userId) => ({ shareId: share.id, userId })));
    }
  });

  revalidatePath(`/machines/${machineId}`);
  return { message: "Reparatur geteilt." };
}

/** Freigabe einer Reparatur aufheben. */
export async function unshareRepair(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const repairId = String(formData.get("repairId"));
  const { darf } = await requireMachineAccess(machineId);
  if (!darf.teilen) throw new Error("Nur Eigentümer oder Club-Manager dürfen das");

  /*
    Die Reparatur MUSS zu dieser Maschine gehören. Vorher wurde gegen
    `machineId` autorisiert, aber nach `repairId` gelöscht — wer eine eigene
    Maschine besaß, konnte mit einer fremden repairId die Freigabe eines
    anderen löschen. shareRepair prüft das bereits, unshareRepair fehlte es.
  */
  const reparatur = await db.query.repairs.findFirst({
    where: and(eq(repairs.id, repairId), eq(repairs.machineId, machineId)),
    columns: { id: true },
  });
  if (!reparatur) throw new Error("Reparatur nicht gefunden");

  await db
    .delete(shares)
    .where(and(eq(shares.artefaktTyp, "repair"), eq(shares.artefaktId, repairId)));

  revalidatePath(`/machines/${machineId}`);
}

/** Freigabe wieder aufheben. */
export async function unshareFacts(formData: FormData): Promise<void> {
  const machineId = String(formData.get("machineId"));
  const { darf } = await requireMachineAccess(machineId);
  if (!darf.teilen) throw new Error("Nur Eigentümer oder Club-Manager dürfen das");

  await db
    .delete(shares)
    .where(
      and(
        eq(shares.artefaktTyp, "machine_facts"),
        eq(shares.artefaktId, machineId),
      ),
    );

  revalidatePath(`/machines/${machineId}`);
}
