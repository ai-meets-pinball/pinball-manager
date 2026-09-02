"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { setzeFeedbackStatus, superAdminEmails } from "@/db/feedback-core";
import { sendFeedbackNotificationEmail } from "@/lib/email";
import { isSuperAdmin, requireUser } from "@/lib/session";
import { uploadFeedbackScreenshot } from "@/lib/storage";
import { FEEDBACK_STATUS, feedbackSchema } from "@/lib/validators";
import { APP_VERSION } from "@/lib/version";
import type { FormState } from "@/db/actions/form-state";

/*
  Feedback-/Bug-Report-System: Nutzer melden Fehler oder Verbesserungswünsche
  ZUR APP (nicht zu Maschinen — das sind `faults`). Der Auto-Kontext (Seite,
  App-Version, Browser) wird HIER serverseitig ergänzt. Alle Meldungen sehen
  nur Super-Admins (Lesepfad in queries.ts / Seite);
  Status/Antwort/Löschen sind Super-Admin-only.
*/

export async function submitFeedback(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireUser();

  const parsed = feedbackSchema.safeParse({
    typ: formData.get("typ"),
    titel: formData.get("titel"),
    beschreibung: formData.get("beschreibung"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  let screenshotUrl: string | null = null;
  try {
    screenshotUrl = await uploadFeedbackScreenshot(
      formData.get("screenshot") as File | null,
      currentUser.id,
    );
  } catch (e) {
    return { error: (e as Error).message };
  }

  const [neu] = await db
    .insert(feedback)
    .values({
      ...parsed.data,
      // Auto-Kontext — nicht vom Nutzer eingetippt:
      seite: String(formData.get("seite") ?? "") || null,
      appVersion: APP_VERSION,
      userAgent: (await headers()).get("user-agent"),
      screenshotUrl,
      createdBy: currentUser.id,
    })
    .returning({ id: feedback.id });

  // Benachrichtigung ist „best effort": ein Mailfehler (z. B. lokal ohne
  // RESEND_API_KEY) darf die Meldung nicht verhindern.
  try {
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    await sendFeedbackNotificationEmail(
      await superAdminEmails(),
      {
        ...parsed.data,
        melder: currentUser.name ?? currentUser.email,
        url: `${baseUrl}/feedback`,
      },
      neu.id,
    );
  } catch (e) {
    console.error("[feedback] Benachrichtigung fehlgeschlagen:", e);
  }

  revalidatePath("/feedback");
  return { message: "Danke — deine Meldung ist eingegangen." };
}

/** Status und/oder Antwort setzen (nur Super-Admin). */
export async function updateFeedback(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireUser();
  if (!isSuperAdmin(currentUser)) {
    return { error: "Nur Super-Admins bearbeiten Meldungen." };
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const antwort = String(formData.get("antwort") ?? "").trim();
  if (!(FEEDBACK_STATUS as readonly string[]).includes(status)) {
    return { error: "Ungültiger Status." };
  }

  // Schreiben + Melder-Benachrichtigung im gemeinsamen Kern (auch vom CLI
  // genutzt). Der Super-Admin-Gate oben verantwortet den Zugriff.
  try {
    await setzeFeedbackStatus({
      id,
      status: status as (typeof FEEDBACK_STATUS)[number],
      antwort,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/feedback");
  // `ok` statt Text: der Bearbeiten-Dialog schließt bei Erfolg (ActionDialog).
  return { ok: true };
}

/** Meldung löschen (nur Super-Admin; ConfirmButton-Formular). */
export async function deleteFeedback(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireUser();
  if (!isSuperAdmin(currentUser)) {
    return { error: "Nur Super-Admins dürfen Meldungen löschen" };
  }

  const id = String(formData.get("id") ?? "");
  await db.delete(feedback).where(eq(feedback.id, id));
  revalidatePath("/feedback");
  return { ok: true };
}
