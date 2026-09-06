"use server";

import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { verknuepfeBesitzerMitKonto } from "@/db/besitzer-link";
import { invitations, roleAssignments } from "@/db/schema";
import { auth } from "@/lib/auth";
import { validatePassword } from "@/lib/validators";
import type { FormState } from "@/db/actions/form-state";

/*
  Registrierung — bewusst über eine eigene Action statt über den Client-Aufruf
  von signUp.email(): nur so lässt sich ein Einladungs-TOKEN prüfen, BEVOR ein
  Konto entsteht.

  Zwei Ausgänge (siehe FormState):
  - Mit Einladung: der Token stand nur in der Einladungs-Mail, das Postfach ist
    damit belegt. Das Konto wird bestätigt angelegt (databaseHook in
    lib/auth.ts), die Person sofort angemeldet → `ok`.
  - Ohne Einladung: offenes Sign-up. Better Auth schickt den Bestätigungslink,
    angemeldet wird erst nach dem Klick (`requireEmailVerification`) → `message`.

  Warum der Token und nicht die Adresse zählt: Wer eine eingeladene Adresse
  kennt, könnte sie sonst fremd registrieren und die Club-Rolle der Einladung
  einsammeln. Mit Token bleibt eine fremd registrierte Adresse ein
  unbestätigtes Konto ohne Club — und die Einladung bleibt `pending`.
*/

const schema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  email: z.string().trim().email("Gültige E-Mail erforderlich"),
  password: z.string(),
  passwordConfirm: z.string(),
  invite: z.string().trim().optional(),
});

/** Wohin der Bestätigungslink bzw. die Anmeldung nach dem Sign-up führt. */
const ZIEL_NACH_REGISTRIERUNG = "/machines";

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
      return {
        error: "Einladung ungültig, abgelaufen oder für eine andere Adresse.",
      };
    }

    // Atomar beanspruchen: nur EIN Aufruf gewinnt das Rennen.
    const beansprucht = await db
      .update(invitations)
      .set({ status: "claiming" })
      .where(
        and(
          eq(invitations.id, einladung.id),
          eq(invitations.status, "pending"),
        ),
      )
      .returning({ id: invitations.id });
    if (beansprucht.length === 0) {
      return { error: "Diese Einladung wird bereits eingelöst." };
    }
    einladungId = einladung.id;
  }

  try {
    const res = await auth.api.signUpEmail({
      body: { name, email, password, callbackURL: ZIEL_NACH_REGISTRIERUNG },
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

    // Wartet ein Besitzer-Eintrag auf dieses Konto? Jetzt verknüpfen.
    if (neueUserId) {
      await verknuepfeBesitzerMitKonto(neueUserId, email);
    }

    // Bestätigt (Einladung oder Bootstrap): Better Auth legt bei Pflicht-
    // Verifikation keine Session an — daher hier anmelden. Der Cookie wird
    // über das nextCookies-Plugin gesetzt.
    if (res.user?.emailVerified) {
      await auth.api.signInEmail({
        body: { email, password },
        headers: await headers(),
      });
      return { ok: true };
    }

    return {
      message: `Fast geschafft: Wir haben einen Bestätigungslink an ${email} geschickt. Nach dem Klick bist du angemeldet.`,
    };
  } catch (e) {
    // Fehlgeschlagene Registrierung darf die Einladung nicht verbrennen.
    if (einladungId) {
      await db
        .update(invitations)
        .set({ status: "pending" })
        .where(eq(invitations.id, einladungId));
    }
    // Details nur ins Server-Log; dem Client eine GENERISCHE Meldung — die
    // rohe Better-Auth-Meldung („User already exists" o. ä.) wäre ein
    // Konto-Existenz-Orakel.
    console.error("[register]", e instanceof Error ? e.message : e);
    return {
      error:
        "Registrierung fehlgeschlagen. Bitte prüfe deine Angaben und versuche es erneut.",
    };
  }
}
