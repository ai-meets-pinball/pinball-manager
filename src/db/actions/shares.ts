"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { shareTargets, shares, user } from "@/db/schema";
import { isClubMember, requireMachineAccess } from "@/lib/session";
import { SHARE_SCOPES } from "@/lib/sharing";
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
  clubIds: z.string().optional(), // kommaseparierte Club-UUIDs
  emails: z.string().optional(), // kommaseparierte E-Mails
});

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

  // Ziele auflösen, BEVOR geschrieben wird — sonst entsteht eine Freigabe
  // ohne Empfänger, die stillschweigend niemanden erreicht.
  const clubIds = (parsed.data.clubIds ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const emails = (parsed.data.emails ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  let zielUserIds: string[] = [];
  if (scope === "club") {
    if (clubIds.length === 0) return { error: "Bitte mindestens einen Club wählen." };
    for (const clubId of clubIds) {
      if (!(await isClubMember(currentUser.id, clubId))) {
        return { error: "Du kannst nur mit Clubs teilen, in denen du Mitglied bist." };
      }
    }
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
    zielUserIds = gefunden.map((g) => g.id);
  }

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
    if (scope === "club") {
      await tx
        .insert(shareTargets)
        .values(clubIds.map((clubId) => ({ shareId: share.id, clubId })));
    }
    if (scope === "users") {
      await tx
        .insert(shareTargets)
        .values(zielUserIds.map((userId) => ({ shareId: share.id, userId })));
    }
  });

  revalidatePath(`/machines/${machineId}`);
  return { message: "Handbuch-Daten geteilt." };
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
