import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  machines,
  roleAssignments,
  roles,
  user,
  userSettings,
  whatsappOptin,
} from "@/db/schema";
import { baseUrl } from "@/lib/qr-code";
import { baueNeuerFehlerNachricht } from "@/lib/whatsapp/nachricht";
import { sendeWhatsapp } from "@/lib/whatsapp/send";

/*
  Empfänger-Auflösung + Versand für die Fehler-Benachrichtigung. BEWUSST OHNE
  "use server": ein gate-loser interner Helfer (wie machine-status-core.ts),
  denn er wird auch aus dem OFFENEN QR-Melde-Pfad (qr-melden.ts) aufgerufen —
  ein "use server"-Export daraus wäre ein offener POST-Endpunkt. Die
  Rechte-Prüfung steckt hier in der Query (nur aktuelle Owner/Admins des Clubs).

  Aufgerufen NACH dem Anlegen eines Fehlers, best-effort (Aufrufer fangen ab):
  ein Versand-/Query-Fehler darf die Fehlermeldung nie zurückrollen.
*/
export async function benachrichtigeUeberNeuenFehler(fault: {
  id: string;
  machineId: string;
  beschreibung: string;
  status: string;
}): Promise<void> {
  // Nur NEUE offene Fehler lösen aus (Schutz; neue Fehler sind ohnehin „offen").
  if (fault.status !== "offen") return;

  // Maschine → Club. Private Maschinen (ohne Club) haben keine Empfänger.
  const [maschine] = await db
    .select({
      clubId: machines.clubId,
      hersteller: machines.hersteller,
      modell: machines.modell,
      clubName: clubs.name,
    })
    .from(machines)
    .leftJoin(clubs, eq(clubs.id, machines.clubId))
    .where(eq(machines.id, fault.machineId))
    .limit(1);
  if (!maschine?.clubId || !maschine.clubName) return;

  // Opt-in-Owner/Admins dieses Clubs MIT hinterlegter Nummer. Der Join gegen
  // role_assignments stellt sicher, dass die Person NOCH Owner/Admin ist.
  const empfaenger = await db
    .select({ nummer: userSettings.whatsappNummer, name: user.name })
    .from(whatsappOptin)
    .innerJoin(
      roleAssignments,
      and(
        eq(roleAssignments.userId, whatsappOptin.userId),
        eq(roleAssignments.clubId, whatsappOptin.clubId),
      ),
    )
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .innerJoin(user, eq(user.id, whatsappOptin.userId))
    .innerJoin(userSettings, eq(userSettings.userId, whatsappOptin.userId))
    .where(
      and(
        eq(whatsappOptin.clubId, maschine.clubId),
        eq(whatsappOptin.aktiv, true),
        inArray(roles.key, ["owner", "admin"]),
        isNotNull(userSettings.whatsappNummer),
      ),
    );
  if (empfaenger.length === 0) return;

  const inhalt = baueNeuerFehlerNachricht({
    maschine: `${maschine.hersteller} ${maschine.modell}`.trim(),
    club: maschine.clubName,
    beschreibung: fault.beschreibung,
    url: `${baseUrl()}/machines/${fault.machineId}?bereich=fehler`,
  });

  for (const e of empfaenger) {
    if (!e.nummer) continue;
    try {
      await sendeWhatsapp({ an: e.nummer, faultId: fault.id, ...inhalt });
    } catch (err) {
      // Der Fehler steht bereits in whatsapp_log; hier nur best-effort schlucken,
      // damit ein schlechter Empfänger die übrigen nicht blockiert.
      console.error(
        "[whatsapp] Versand an einen Empfänger fehlgeschlagen:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}
