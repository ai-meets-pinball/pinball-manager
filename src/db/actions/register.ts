"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { invitations, roleAssignments, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { istSuperAdminEmail } from "@/lib/super-admins";
import { validatePassword } from "@/lib/validators";
import type { FormState } from "@/db/actions/clubs";

/*
  Registrierung — bewusst über eine eigene Action statt über den Client-Aufruf
  von signUp.email().

  Warum: Das frühere Gate prüfte nur, ob für die angegebene E-MAIL eine offene
  Einladung existiert. Wer eine eingeladene Adresse kannte, konnte sie fremd
  registrieren (es gibt keine E-Mail-Verifikation) und anschließend die
  Einladung annehmen. Der Besitz des Postfachs wurde nie belegt.

  Jetzt zählt der TOKEN: er steht nur in der Einladungs-Mail. Diese Action
  prüft ihn, setzt die Einladung atomar auf `claiming` und ruft erst dann
  Better Auth auf. Der Hook in lib/auth.ts lässt Sign-up ausschließlich für
  Einladungen in genau diesem Zustand zu — ein direkter POST auf
  /api/auth/sign-up/email findet nur `pending` vor und scheitert.
*/

const schema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  email: z.string().trim().email("Gültige E-Mail erforderlich"),
  password: z.string(),
  passwordConfirm: z.string(),
  invite: z.string().trim().optional(),
});

export async function registerAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const { name, password, passwordConfirm, invite } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // Passwort-Policy auch hier prüfen (der Auth-Hook tut es erneut).
  const policy = validatePassword(password);
  if (policy) return { error: policy };
  if (password !== passwordConfirm) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  /* Bootstrap: eine leere Installation muss startbar sein. Nur dann darf sich
     eine Adresse aus SUPER_ADMIN_EMAILS ohne Einladung registrieren. */
  const [{ anzahl }] = await db.select({ anzahl: count() }).from(user);
  const istBootstrap = anzahl === 0 && istSuperAdminEmail(email);

  if (!invite && !istBootstrap) {
    return {
      error:
        "Registrierung ist nur mit Einladung möglich. Bitte nutze den Link aus deiner Einladungs-E-Mail.",
    };
  }

  let einladungId: string | null = null;
  if (invite) {
    // Token → Einladung. Die E-Mail MUSS zur Einladung passen: sonst könnte
    // man mit fremdem Token eine beliebige Adresse registrieren.
    const einladung = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, invite),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
      ),
    });
    if (!einladung || einladung.email.toLowerCase() !== email) {
      return { error: "Einladung ungültig, abgelaufen oder für eine andere Adresse." };
    }

    // Atomar beanspruchen: nur EIN Aufruf gewinnt das Rennen.
    const beansprucht = await db
      .update(invitations)
      .set({ status: "claiming" })
      .where(
        and(eq(invitations.id, einladung.id), eq(invitations.status, "pending")),
      )
      .returning({ id: invitations.id });
    if (beansprucht.length === 0) {
      return { error: "Diese Einladung wird bereits eingelöst." };
    }
    einladungId = einladung.id;
  }

  try {
    const res = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
    const neueUserId = res.user?.id;

    if (einladungId && neueUserId) {
      const einladung = await db.query.invitations.findFirst({
        where: eq(invitations.id, einladungId),
      });
      // Club-Einladung: Mitgliedschaft anlegen. Plattform-Einladung: nur quittieren.
      if (einladung?.clubId && einladung.roleId) {
        await db
          .insert(roleAssignments)
          .values({
            userId: neueUserId,
            clubId: einladung.clubId,
            roleId: einladung.roleId,
          })
          .onConflictDoNothing();
      }
      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, einladungId));
    }

    return { message: "Konto erstellt." };
  } catch (e) {
    // Fehlgeschlagene Registrierung darf die Einladung nicht verbrennen.
    if (einladungId) {
      await db
        .update(invitations)
        .set({ status: "pending" })
        .where(eq(invitations.id, einladungId));
    }
    const msg = e instanceof Error ? e.message : "Registrierung fehlgeschlagen";
    console.error("[register]", msg);
    return { error: msg };
  }
}
