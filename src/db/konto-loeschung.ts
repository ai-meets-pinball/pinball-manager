import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  emailTemplates,
  faultImages,
  faults,
  feedback,
  invitations,
  knowledge,
  knowledgeRevisions,
  machineBesitzer,
  machineDokumente,
  machines,
  maintenanceLog,
  promptOverrides,
  termine,
  user,
  userSettings,
} from "@/db/schema";
import { countClubOwners } from "@/lib/session";
import { getUserClubs } from "@/db/queries";
import { SUPER_ADMIN_EMAILS } from "@/lib/super-admins";
import { deleteStorageObject } from "@/lib/storage";

/*
  Der EINE Weg, ein Konto zu löschen — genutzt vom Self-Service (actions/
  account.ts, DSGVO Art. 17) und vom Admin (actions/admin.ts). Bewusst KEIN
  "use server": aus so einer Datei wäre jede exportierte async-Funktion ein
  öffentlich aufrufbarer Endpunkt — der Guard (wer darf wen löschen) liegt
  deshalb in den Actions, hier steckt nur das Wie.

  Sicher gestaltet: zerstört NIE fremde/geteilte Daten und hinterlässt keine
  verwaisten Fremdschlüssel. Ablauf: Guards (alleiniger Club-Owner / kein
  Übertragungsziel → blocken) → Storage der eigenen Medien leeren → in EINER
  Transaktion: private Maschinen löschen (Cascade), erstellte/geteilte Inhalte an
  einen Fallback übertragen, Beiträge zu FREMDEN Maschinen anonymisieren
  (SET NULL), dann den Nutzer löschen (cascadet Auth + persönliche Tabellen).
*/

export type LoeschBlocker =
  | { art: "alleinOwner"; clubs: string[] }
  | { art: "keinFallback" };

/** Ein Super-Admin aus der Allowlist, der NICHT der Betroffene ist — als Ziel
    für erstellte/geteilte Inhalte. null, wenn es keinen gibt. */
export async function fallbackSuperAdmin(ausser: string): Promise<string | null> {
  if (SUPER_ADMIN_EMAILS.length === 0) return null;
  const kandidat = await db
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.email, SUPER_ADMIN_EMAILS), ne(user.id, ausser)))
    .limit(1);
  return kandidat[0]?.id ?? null;
}

/** Warum das Konto (noch) nicht gelöscht werden kann — oder null. */
export async function loeschBlocker(
  userId: string,
  fallbackId: string | null,
): Promise<LoeschBlocker | null> {
  // Guard 1: alleiniger Owner eines Clubs → sonst bliebe ein Club ohne Owner.
  const alleinOwner: string[] = [];
  for (const c of await getUserClubs(userId)) {
    if (c.rolle === "owner" && (await countClubOwners(c.id)) <= 1) {
      alleinOwner.push(c.name);
    }
  }
  if (alleinOwner.length > 0) return { art: "alleinOwner", clubs: alleinOwner };
  // Guard 2: kein Übertragungsziel (z. B. der einzige Super-Admin/Betreiber).
  if (!fallbackId) return { art: "keinFallback" };
  return null;
}

/** Löscht das Konto. Voraussetzung: loeschBlocker(...) war null. */
export async function loescheNutzer(userId: string, fallbackId: string): Promise<void> {
  // ── Storage-Objekte einsammeln, VOR dem DB-Löschen (Cascade räumt kein
  //    Supabase-Storage; sonst Waisen). ──
  const meineMaschinen = await db
    .select({ id: machines.id, fotoUrl: machines.fotoUrl })
    .from(machines)
    .where(and(eq(machines.ownerId, userId), isNull(machines.clubId)));
  const privatIds = meineMaschinen.map((m) => m.id);

  const urls: (string | null)[] = [];
  const meRow = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, userId));
  urls.push(meRow[0]?.image ?? null);
  const settings = await db
    .select({ logoUrl: userSettings.logoUrl })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  urls.push(...settings.map((s) => s.logoUrl));
  urls.push(...meineMaschinen.map((m) => m.fotoUrl));
  if (privatIds.length > 0) {
    const bilder = await db
      .select({ url: faultImages.url })
      .from(faultImages)
      .innerJoin(faults, eq(faultImages.faultId, faults.id))
      .where(inArray(faults.machineId, privatIds));
    urls.push(...bilder.map((b) => b.url));
    const docs = await db
      .select({ url: machineDokumente.url })
      .from(machineDokumente)
      .where(
        and(
          inArray(machineDokumente.machineId, privatIds),
          eq(machineDokumente.typ, "datei"),
        ),
      );
    urls.push(...docs.map((d) => d.url));
  }
  const screens = await db
    .select({ url: feedback.screenshotUrl })
    .from(feedback)
    .where(eq(feedback.createdBy, userId));
  urls.push(...screens.map((s) => s.url));

  // Best-effort (nicht Teil der DB-Transaktion; deleteStorageObject schluckt Fehler).
  for (const u of urls) await deleteStorageObject(u);

  // ── DB in EINER Transaktion. ──
  await db.transaction(async (tx) => {
    // 1. Private Maschinen (Cascade: Fehler/Bilder/Reparaturen/Wartung/Termine/
    //    Dokumente/Ausstattung/Besitzer-Zuordnung/maschinenbezogenes Wissen).
    if (privatIds.length > 0) {
      await tx.delete(machines).where(inArray(machines.id, privatIds));
    }

    // 2. Harte Blocker (NOT NULL, kein Cascade): Autorschaft an den Fallback
    //    übertragen — Inhalt bleibt erhalten. Übrige eigene Maschinen sind jetzt
    //    Club-Maschinen (ownerId), die dem Club erhalten bleiben.
    await tx
      .update(machines)
      .set({ ownerId: fallbackId })
      .where(eq(machines.ownerId, userId));
    await tx
      .update(clubs)
      .set({ createdBy: fallbackId })
      .where(eq(clubs.createdBy, userId));
    await tx
      .update(machineBesitzer)
      .set({ createdBy: fallbackId })
      .where(eq(machineBesitzer.createdBy, userId));
    await tx
      .update(knowledge)
      .set({ createdBy: fallbackId })
      .where(eq(knowledge.createdBy, userId));
    await tx
      .update(knowledgeRevisions)
      .set({ editedBy: fallbackId })
      .where(eq(knowledgeRevisions.editedBy, userId));
    await tx
      .update(invitations)
      .set({ invitedBy: fallbackId })
      .where(eq(invitations.invitedBy, userId));

    // 3. Weiche Blocker (nullable): Beiträge zu FREMDEN Maschinen anonymisieren.
    await tx
      .update(machines)
      .set({ statusVon: null })
      .where(eq(machines.statusVon, userId));
    await tx
      .update(faults)
      .set({ gemeldetVon: null })
      .where(eq(faults.gemeldetVon, userId));
    await tx
      .update(maintenanceLog)
      .set({ erledigtVon: null })
      .where(eq(maintenanceLog.erledigtVon, userId));
    await tx
      .update(termine)
      .set({ createdBy: null })
      .where(eq(termine.createdBy, userId));
    await tx
      .update(machineDokumente)
      .set({ createdBy: null })
      .where(eq(machineDokumente.createdBy, userId));
    await tx
      .update(emailTemplates)
      .set({ updatedBy: null })
      .where(eq(emailTemplates.updatedBy, userId));
    await tx
      .update(promptOverrides)
      .set({ updatedBy: null })
      .where(eq(promptOverrides.updatedBy, userId));

    // 4. Nutzer löschen → Cascade: session/account (Better Auth) + roleAssignments,
    //    shares/shareTargets, userSettings, knowledgeSignals/Overrides, feedback,
    //    whatsappOptin, maintenancePlans(→items). Danach ist die Session ungültig.
    await tx.delete(user).where(eq(user.id, userId));
  });
}
