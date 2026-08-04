"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { feedback, roleAssignments, roles, user } from "@/db/schema";
import { sendFeedbackNotificationEmail } from "@/lib/email";
import { isSuperAdmin, requireUser } from "@/lib/session";
import { uploadFeedbackScreenshot } from "@/lib/storage";
import {
  FEEDBACK_STATUS,
  feedbackSchema,
  SUPERADMIN_ROLE,
} from "@/lib/validators";
import { APP_VERSION } from "@/lib/version";
import type { FormState } from "@/db/actions/clubs";

/*
  Feedback-/Bug-Report-System: Nutzer melden Fehler oder Verbesserungswünsche
  ZUR APP (nicht zu Maschinen — das sind `faults`). Der Auto-Kontext (Seite,
  App-Version, Browser) wird HIER serverseitig ergänzt. Sehen dürfen alle
  Meldungen Super-Admins und Supporter (Lesepfad in queries.ts / Seite);
  Status/Antwort/Löschen sind Super-Admin-only.
*/

/** E-Mails aller globalen Super-Admins (für die Benachrichtigung). */
async function superAdminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .innerJoin(user, eq(user.id, roleAssignments.userId))
    .where(and(eq(roles.key, SUPERADMIN_ROLE), isNull(roleAssignments.clubId)));
  return rows.map((r) => r.email);
}

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

  await db.insert(feedback).values({
    ...parsed.data,
    // Auto-Kontext — nicht vom Nutzer eingetippt:
    seite: String(formData.get("seite") ?? "") || null,
    appVersion: APP_VERSION,
    userAgent: (await headers()).get("user-agent"),
    screenshotUrl,
    createdBy: currentUser.id,
  });

  // Benachrichtigung ist „best effort": ein Mailfehler (z. B. lokal ohne
  // RESEND_API_KEY) darf die Meldung nicht verhindern.
  try {
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    await sendFeedbackNotificationEmail(await superAdminEmails(), {
      ...parsed.data,
      melder: currentUser.name ?? currentUser.email,
      url: `${baseUrl}/feedback`,
    });
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

  await db
    .update(feedback)
    .set({
      status: status as (typeof FEEDBACK_STATUS)[number],
      antwort: antwort || null,
      updatedAt: new Date(),
    })
    .where(eq(feedback.id, id));

  revalidatePath("/feedback");
  return { message: "Gespeichert." };
}

/** Meldung löschen (nur Super-Admin; ConfirmButton-Formular). */
export async function deleteFeedback(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  if (!isSuperAdmin(currentUser)) return;

  const id = String(formData.get("id") ?? "");
  await db.delete(feedback).where(eq(feedback.id, id));
  revalidatePath("/feedback");
}
