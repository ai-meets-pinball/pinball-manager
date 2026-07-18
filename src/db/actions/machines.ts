"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { machineModels, machines } from "@/db/schema";
import { parseOpdbRef } from "@/lib/opdb-ref";
import {
  isClubManager,
  isClubMember,
  isSuperAdmin,
  requireMachineAccess,
  requireUser,
} from "@/lib/session";
import { uploadMachinePhoto } from "@/lib/storage";
import { machineSchema } from "@/lib/validators";

export type FormState = { error?: string };

/*
  Nur echte OPDB-Bild-URLs zulassen — der Wert kommt aus einem versteckten
  Formularfeld und landet ungefiltert als <img src>, darum hier begrenzen.
*/
function opdbImageUrl(formData: FormData): string | null {
  const raw = (formData.get("opdbImageUrl") as string | null)?.trim();
  return raw && raw.startsWith("https://img.opdb.org/") ? raw : null;
}

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

/*
  Sorgt dafür, dass es zum OPDB-Bezug einen Eintrag im geteilten Gerätetyp-Katalog
  gibt, und liefert dessen id (oder null).

  Zwei bewusste Regeln:
  - Nur EDITIONS-Referenzen taugen als Gerätetyp. Eine reine Gruppen-Referenz
    (nur Titel) wird verworfen, weil sich Spulen-/Schaltermatrizen je Edition
    unterscheiden. Aliasse werden auf ihre Edition normalisiert.
  - `onConflictDoNothing`: der Katalog gehört niemandem. Wer eine Maschine später
    anlegt (und seine Instanzfelder frei editiert hat), darf die Katalogdaten
    aller anderen NICHT überschreiben — first writer wins.
*/
async function ensureMachineModel(
  data: {
    opdbRef?: string;
    hersteller: string;
    modell: string;
    baujahr?: number;
    ipdbRef?: string;
  },
  imageUrl: string | null,
): Promise<string | null> {
  const teile = parseOpdbRef(data.opdbRef);
  if (!teile?.machineRef) return null;

  await db
    .insert(machineModels)
    .values({
      opdbRef: teile.machineRef,
      opdbGroupRef: teile.groupRef,
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      ipdbRef: data.ipdbRef ?? null,
      imageUrl,
    })
    .onConflictDoNothing();

  const model = await db.query.machineModels.findFirst({
    where: eq(machineModels.opdbRef, teile.machineRef),
    columns: { id: true },
  });
  return model?.id ?? null;
}

export async function createMachine(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const result = await parseMachine(user.id, formData);
  if ("error" in result) return result;
  const data = result.data;

  // Eigenes Foto hat Vorrang; sonst das OPDB-Bild verwenden.
  const fotoUrl =
    (await uploadMachinePhoto(formData.get("foto") as File | null, user.id)) ??
    opdbImageUrl(formData);

  const modelId = await ensureMachineModel(data, opdbImageUrl(formData));

  const [created] = await db
    .insert(machines)
    .values({
      ownerId: user.id,
      clubId: data.clubId ?? null,
      modelId,
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

  // Eigenes Foto hat Vorrang; sonst ein neu gewähltes OPDB-Bild.
  const neuesFoto =
    (await uploadMachinePhoto(formData.get("foto") as File | null, user.id)) ??
    opdbImageUrl(formData);

  await db
    .update(machines)
    .set({
      clubId: data.clubId ?? null,
      // Beim Ändern des OPDB-Bezugs wandert die Maschine zum passenden Gerätetyp.
      modelId: await ensureMachineModel(data, opdbImageUrl(formData)),
      hersteller: data.hersteller,
      modell: data.modell,
      baujahr: data.baujahr ?? null,
      opdbRef: data.opdbRef ?? null,
      ipdbRef: data.ipdbRef ?? null,
      // Foto nur ersetzen, wenn ein neues hochgeladen oder aus OPDB gewählt wurde.
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

  // Löschen darf nur der Eigentümer, ein Club-Manager (Owner/Admin) oder ein Super-Admin.
  const darfLoeschen =
    isSuperAdmin(user) ||
    machine.ownerId === user.id ||
    (machine.clubId !== null && (await isClubManager(user.id, machine.clubId)));
  if (!darfLoeschen) {
    throw new Error("Nur Eigentümer oder Club-Owner/-Admin dürfen löschen");
  }

  await db.delete(machines).where(eq(machines.id, id));
  revalidatePath("/machines");
  redirect("/machines");
}
