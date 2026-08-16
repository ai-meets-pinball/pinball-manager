import {
  desc,
  eq,
} from "drizzle-orm";
import { db } from "@/db";
import {
  feedback,
  user,
} from "@/db/schema";
import {
  isSuperAdmin,
  type SessionUser,
} from "@/lib/session";

/* Feedback und Bug-Reports: eigene Meldungen und die Triage-Sicht. */

/** Eigene Meldungen des Nutzers, neueste zuerst. */
export async function getMeinFeedback(userId: string) {
  return db
    .select()
    .from(feedback)
    .where(eq(feedback.createdBy, userId))
    .orderBy(desc(feedback.createdAt));
}

/** ALLE Meldungen samt Melder — nur für Super-Admins (der Aufrufer sichert den
    Zugriff ebenfalls ab). */
export async function getAllesFeedback(currentUser: SessionUser) {
  if (!isSuperAdmin(currentUser)) {
    throw new Error("Kein Zugriff auf fremde Meldungen");
  }
  return db
    .select({
      id: feedback.id,
      typ: feedback.typ,
      titel: feedback.titel,
      beschreibung: feedback.beschreibung,
      seite: feedback.seite,
      appVersion: feedback.appVersion,
      userAgent: feedback.userAgent,
      screenshotUrl: feedback.screenshotUrl,
      status: feedback.status,
      antwort: feedback.antwort,
      createdAt: feedback.createdAt,
      melderName: user.name,
      melderEmail: user.email,
    })
    .from(feedback)
    .innerJoin(user, eq(user.id, feedback.createdBy))
    .orderBy(desc(feedback.createdAt));
}
