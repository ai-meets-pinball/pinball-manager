"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { machineModels, machines, repairs, shares } from "@/db/schema";
import { parseOpdbRef } from "@/lib/opdb-ref";
import {
  isClubManager,
  isClubMember,
  isSuperAdmin,
  requireMachineAccess,
  requireMachineWrite,
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

/** Alle Freigaben einer Maschine aufheben: die Fakten-Freigabe (artefaktId =
    machineId) und die Freigaben ihrer Reparaturen. */
async function widerrufeFreigaben(machineId: string) {
  await db
    .delete(shares)
    .where(
      and(
        eq(shares.artefaktTyp, "machine_facts"),
        eq(shares.artefaktId, machineId),
      ),
    );

  const eigeneReparaturen = db
    .select({ id: repairs.id })
    .from(repairs)
    .where(eq(repairs.machineId, machineId));

  await db
    .delete(shares)
    .where(
      and(eq(shares.artefaktTyp, "repair"), inArray(shares.artefaktId, eigeneReparaturen)),
    );
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
  // Schreib-Gate: lehnt Supporter (nur Lesezugriff) ab.
  const { user, machine, darf } = await requireMachineWrite(id);

  const result = await parseMachine(user.id, formData);
  if ("error" in result) return result;
  const data = result.data;

  /*
    Die Club-Zuordnung darf NUR ändern, wer die Maschine auch löschen dürfte
    (Eigentümer, Club-Manager, Super-Admin).

    Vorher genügte Bearbeitungsrecht — und das hat jedes Club-Mitglied. Ein
    einfaches Mitglied konnte eine fremde Maschine samt Fehlern, Reparaturen
    und Handbuch-Fakten in einen eigenen Club verschieben oder sie aus dem
    bisherigen Club herauslösen. Für alle anderen bleibt die Zuordnung stehen.
  */
  const clubId = darf.loeschen ? (data.clubId ?? null) : machine.clubId;

  // Eigenes Foto hat Vorrang; sonst ein neu gewähltes OPDB-Bild.
  const neuesFoto =
    (await uploadMachinePhoto(formData.get("foto") as File | null, user.id)) ??
    opdbImageUrl(formData);

  /*
    Wechselt der Gerätetyp, werden bestehende Freigaben dieser Maschine
    WIDERRUFEN. Sonst blieben sie am alten Typ hängen und andere Besitzer
    bekämen die Daten eines ganz anderen Automaten als passende Referenz
    angezeigt — bei Spulen- und Schaltermatrizen ist das kein Schönheitsfehler.
  */
  const neuerModelId = await ensureMachineModel(data, opdbImageUrl(formData));
  if (neuerModelId !== machine.modelId) {
    await widerrufeFreigaben(id);
  }

  await db
    .update(machines)
    .set({
      clubId,
      modelId: neuerModelId,
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

export type BulkAssignState = {
  error?: string;
  anzahl?: number;
  uebersprungen?: number;
};

/*
  Mehrere Maschinen auf einmal einem Club zuweisen (oder aus dem Club lösen,
  clubId = null). Spiegelt die Einzel-Regeln aus updateMachine:
  - Ziel-Club: nur ein Club, in dem der Nutzer Mitglied ist (isClubMember).
  - Je Maschine: die Zuordnung darf nur ändern, wer die Maschine auch löschen
    dürfte (Eigentümer, Club-Manager des bisherigen Clubs, Super-Admin). Nicht
    erlaubte Maschinen werden übersprungen und in `uebersprungen` gezählt.
*/
export async function assignMachinesToClub(
  _prev: BulkAssignState,
  formData: FormData,
): Promise<BulkAssignState> {
  const user = await requireUser();

  const raw = String(formData.get("clubId") ?? "");
  // "none" = aus dem Club entfernen; leerer Wert wird vom required-Select verhindert.
  const clubId = raw === "" || raw === "none" ? null : raw;

  const ids = formData.getAll("machineIds").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Keine Maschinen ausgewählt." };

  if (clubId && !(await isClubMember(user.id, clubId))) {
    return { error: "Du bist kein Mitglied des gewählten Clubs." };
  }

  const selected = await db.query.machines.findMany({
    where: inArray(machines.id, ids),
    columns: { id: true, ownerId: true, clubId: true },
  });

  const erlaubt: string[] = [];
  for (const m of selected) {
    const darfLoeschen =
      isSuperAdmin(user) ||
      m.ownerId === user.id ||
      (m.clubId !== null && (await isClubManager(user.id, m.clubId)));
    if (darfLoeschen) erlaubt.push(m.id);
  }

  if (erlaubt.length > 0) {
    await db.update(machines).set({ clubId }).where(inArray(machines.id, erlaubt));
    revalidatePath("/machines");
  }

  return { anzahl: erlaubt.length, uebersprungen: selected.length - erlaubt.length };
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
