import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  machines,
  roleAssignments,
  roles,
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
  // Nur OFFENE Fehler alarmieren. createFault lässt zwar jeden Status zu (der
  // Editor kann einen Fehler direkt als „behoben"/„in Arbeit" anlegen — dann kein
  // Alarm); QR-Meldungen sind ohnehin immer „offen".
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
    .select({ nummer: userSettings.whatsappNummer })
    .from(whatsappOptin)
    .innerJoin(
      roleAssignments,
      and(
        eq(roleAssignments.userId, whatsappOptin.userId),
        eq(roleAssignments.clubId, whatsappOptin.clubId),
      ),
    )
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
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

  // Parallel senden — je Empfänger ein Twilio-Round-Trip; seriell würde den
  // (auch öffentlichen QR-) Melde-Request unnötig lange blockieren. Jeder Fehler
  // steht bereits im whatsapp_log; allSettled schluckt Ablehnungen best-effort,
  // damit ein schlechter Empfänger die übrigen nicht blockiert.
  const nummern = empfaenger
    .map((e) => e.nummer)
    .filter((n): n is string => Boolean(n));
  await Promise.allSettled(
    nummern.map((an) => sendeWhatsapp({ an, faultId: fault.id, ...inhalt })),
  );
}
