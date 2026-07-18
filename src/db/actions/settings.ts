"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { clubSettings, userSettings } from "@/db/schema";
import { requireClubManager, requireUser } from "@/lib/session";
import { SHARE_SCOPES } from "@/lib/sharing";
import type { FormState } from "@/db/actions/clubs";

/*
  Freigabe-Voreinstellungen speichern/zurücksetzen.
  Eine Zeile = Abweichung vom Standard aus lib/share-defaults.ts; „Zurücksetzen"
  löscht die Zeile (gleiches Muster wie bei den E-Mail-Vorlagen).
*/

const schema = z.object({
  defaultScope: z.enum(SHARE_SCOPES),
  defaultAnonym: z.string().optional(),
  defaultZeigeKosten: z.string().optional(),
  autoShareFacts: z.string().optional(),
  autoShareRepairs: z.string().optional(),
  clubId: z.string().uuid().optional(), // gesetzt = Club-Einstellungen
});

export async function saveShareSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const d = parsed.data;
  const werte = {
    defaultScope: d.defaultScope,
    defaultAnonym: d.defaultAnonym === "on",
    defaultZeigeKosten: d.defaultZeigeKosten === "on",
    autoShareFacts: d.autoShareFacts === "on",
    autoShareRepairs: d.autoShareRepairs === "on",
    updatedAt: new Date(),
  };

  if (d.clubId) {
    // Club-Voreinstellungen dürfen nur Owner/Admins ändern.
    await requireClubManager(d.clubId);
    await db
      .insert(clubSettings)
      .values({ clubId: d.clubId, ...werte })
      .onConflictDoUpdate({ target: clubSettings.clubId, set: werte });
    revalidatePath(`/clubs/${d.clubId}`);
  } else {
    const currentUser = await requireUser();
    await db
      .insert(userSettings)
      .values({ userId: currentUser.id, ...werte })
      .onConflictDoUpdate({ target: userSettings.userId, set: werte });
    revalidatePath("/account");
  }

  return { message: "Voreinstellungen gespeichert." };
}

export async function resetShareSettings(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  if (clubId) {
    await requireClubManager(clubId);
    await db.delete(clubSettings).where(eq(clubSettings.clubId, clubId));
    revalidatePath(`/clubs/${clubId}`);
    return;
  }
  const currentUser = await requireUser();
  await db.delete(userSettings).where(eq(userSettings.userId, currentUser.id));
  revalidatePath("/account");
}
