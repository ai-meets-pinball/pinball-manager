"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { machines } from "@/db/schema";
import {
  isClubAdmin,
  isClubMember,
  requireMachineAccess,
  requireUser,
} from "@/lib/session";
import { uploadMachinePhoto } from "@/lib/storage";
import { machineSchema } from "@/lib/validators";

export type FormState = { error?: string };

/* Hilfsfunktion: gemeinsame Validierung + optionale Club-Zuordnung prüfen. */
async function parseMachine(userId: string, formData: FormData) {
  const parsed = machineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const data = parsed.data;
  if (data.clubId && !(await isClubMember(userId, data.clubId))) {
    return { error: "Du bist kein Mitglied des gewählten Clubs" };
  }
  return { data };
}

export async function createMachine(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const result = await parseMachine(user.id, formData);
  if ("error" in result) return result;
  const data = result.data;

  const fotoUrl = await uploadMachinePhoto(
    formData.get("foto") as File | null,
    user.id,
  );

  const [created] = await db
    .insert(machines)
    .values({
      ownerId: user.id,
      clubId: data.clubId ?? null,
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      opdbRef: data.opdbRef ?? null,
      ipdbRef: data.ipdbRef ?? null,
      fotoUrl,
    })
    .returning({ id: machines.id });

  revalidatePath("/machines");
  redirect(`/machines/${created.id}`);
}

export async function updateMachine(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id"));
  const { user } = await requireMachineAccess(id);

  const result = await parseMachine(user.id, formData);
  if ("error" in result) return result;
  const data = result.data;

  const neuesFoto = await uploadMachinePhoto(
    formData.get("foto") as File | null,
    user.id,
  );

  await db
    .update(machines)
    .set({
      clubId: data.clubId ?? null,
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      opdbRef: data.opdbRef ?? null,
      ipdbRef: data.ipdbRef ?? null,
      // Foto nur ersetzen, wenn ein neues hochgeladen wurde.
      ...(neuesFoto ? { fotoUrl: neuesFoto } : {}),
    })
    .where(eq(machines.id, id));

  revalidatePath("/machines");
  revalidatePath(`/machines/${id}`);
  redirect(`/machines/${id}`);
}

export async function deleteMachine(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const { user, machine } = await requireMachineAccess(id);

  // Löschen darf nur der Eigentümer oder ein Club-Admin.
  const darfLoeschen =
    machine.ownerId === user.id ||
    (machine.clubId !== null && (await isClubAdmin(user.id, machine.clubId)));
  if (!darfLoeschen) {
    throw new Error("Nur Eigentümer oder Club-Admin dürfen löschen");
  }

  await db.delete(machines).where(eq(machines.id, id));
  revalidatePath("/machines");
  redirect("/machines");
}
