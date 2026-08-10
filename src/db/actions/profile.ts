"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { uploadAvatar } from "@/lib/storage";
import type { FormState } from "@/db/actions/form-state";

/*
  Profil speichern: Vorname/Nachname/Initialen + optionales Profilbild.
  `name` (der Anzeigename überall in der App, z. B. „Geteilt von …") wird aus
  Vor- + Nachname abgeleitet; leere Initialen fallen auf die Standard-Initialen
  zurück (erste Buchstaben von Vor- und Nachname — siehe lib/format.ts).
*/
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();

  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const initialenRoh = String(formData.get("initialen") ?? "").trim();

  if (!vorname || !nachname) {
    return { error: "Vor- und Nachname sind erforderlich." };
  }
  if (vorname.length > 60 || nachname.length > 60) {
    return { error: "Name zu lang (maximal 60 Zeichen)." };
  }
  if (initialenRoh.length > 3) {
    return { error: "Initialen: maximal 3 Zeichen." };
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadAvatar(formData.get("avatar") as File | null, me.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  await db
    .update(user)
    .set({
      firstName: vorname,
      lastName: nachname,
      initials: initialenRoh || null,
      name: `${vorname} ${nachname}`,
      ...(imageUrl ? { image: imageUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, me.id));

  revalidatePath("/account");
  return { message: "Profil gespeichert." };
}

/** Profilbild entfernen (zurück zu den Initialen). */
export async function removeAvatar(): Promise<void> {
  const me = await requireUser();
  await db
    .update(user)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(user.id, me.id));
  revalidatePath("/account");
}
