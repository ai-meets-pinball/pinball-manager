"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings, whatsappOptin } from "@/db/schema";
import { requireClubManager, requireUser } from "@/lib/session";
import { whatsappNummerSchema } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Opt-in-Verwaltung für die WhatsApp-Fehler-Benachrichtigung (siehe
  db/whatsapp-benachrichtigung.ts). Zwei Achsen:
  - die globale Nummer je Nutzer (user_settings.whatsapp_nummer),
  - je Club ein An/Aus (whatsapp_optin).
  Upsert-Muster wie saveShareSettings (settings.ts).
*/

/** Globale WhatsApp-Nummer speichern; leere Eingabe = löschen (globales Opt-out). */
export async function saveWhatsappNummer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = whatsappNummerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const user = await requireUser();
  const nummer = parsed.data.nummer === "" ? null : parsed.data.nummer;

  await db
    .insert(userSettings)
    .values({ userId: user.id, whatsappNummer: nummer })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { whatsappNummer: nummer, updatedAt: new Date() },
    });

  revalidatePath("/account");
  return {
    message: nummer ? "WhatsApp-Nummer gespeichert." : "WhatsApp-Nummer entfernt.",
  };
}

/** Per-Club-Opt-in umschalten (an↔aus). Nur Owner/Admins des Clubs — die
    Empfänger-Query filtert ohnehin darauf, und der Schalter ist nur ihnen sichtbar.
    Flip-Semantik wie toggleTurniermodus. */
export async function toggleWhatsappOptin(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  const user = await requireClubManager(clubId);

  const [vorhanden] = await db
    .select({ aktiv: whatsappOptin.aktiv })
    .from(whatsappOptin)
    .where(
      and(eq(whatsappOptin.userId, user.id), eq(whatsappOptin.clubId, clubId)),
    )
    .limit(1);
  const neu = !(vorhanden?.aktiv ?? false);

  await db
    .insert(whatsappOptin)
    .values({ userId: user.id, clubId, aktiv: neu })
    .onConflictDoUpdate({
      target: [whatsappOptin.userId, whatsappOptin.clubId],
      set: { aktiv: neu },
    });

  revalidatePath("/account");
}
