import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  machines,
  roleAssignments,
  roles,
  userSettings,
  whatsappLog,
  whatsappOptin,
} from "@/db/schema";
import { baseUrl } from "@/lib/qr-code";
import { baueNeuerFehlerNachricht } from "@/lib/whatsapp/nachricht";
import { whatsappVersandAktiv } from "@/lib/whatsapp/provider";
import { sendeWhatsapp } from "@/lib/whatsapp/send";

/*
  Empfänger-Auflösung + Versand für die Fehler-Benachrichtigung. BEWUSST OHNE
  "use server": ein gate-loser interner Helfer (wie machine-status-core.ts),
  denn er wird auch aus dem OFFENEN QR-Melde-Pfad (qr-melden.ts) aufgerufen —
  ein "use server"-Export daraus wäre ein offener POST-Endpunkt. Die
  Rechte-Prüfung steckt hier in der Query (nur aktuelle Owner/Admins des Clubs).

  Aufgerufen NACH dem Anlegen eines Fehlers, best-effort (Aufrufer fangen ab):
  ein Versand-/Query-Fehler darf die Fehlermeldung nie zurückrollen.

  Wiederhol-/Missbrauchsschutz (wichtig, weil der öffentliche QR-Pfad hier
  einläuft und jede echte Nachricht Geld kostet):
  - COOLDOWN je (Maschine, Empfänger): wer zu DIESER Maschine kürzlich schon
    benachrichtigt wurde, bekommt nicht sofort die nächste Meldung — die Person
    kümmert sich ohnehin gerade um das Gerät, und alle Fehler stehen weiter auf
    der Geräteseite. Das bremst das Fluten mit leicht variierten Gast-Meldungen
    (die Exakt-Duplikat-Sperre in qr-melden.ts greift da nicht).
  - TAGESLIMIT (global, rollierende 24 h): harte Notbremse gegen Kosten-
    Amplifikation über viele Maschinen; nur bei echtem Versand geprüft.
  Beides wird aus whatsapp_log berechnet (denormalisierte machine_id /
  recipient_user_id), ohne eigene Tabelle. Werte bewusst als Konstanten sichtbar.
*/
const COOLDOWN_MINUTEN = 30;
const TAGESLIMIT = 500;

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

  // Tages-Notbremse (nur bei echtem Versand — im none-Modus kostet nichts, und
  // die simulierten Zeilen sollen das Limit nicht auffressen).
  if (whatsappVersandAktiv()) {
    const seit24h = new Date(Date.now() - 24 * 60 * 60_000);
    const [q] = await db
      .select({ n: count() })
      .from(whatsappLog)
      .where(
        and(eq(whatsappLog.erfolg, true), gte(whatsappLog.gesendetAm, seit24h)),
      );
    if (Number(q?.n ?? 0) >= TAGESLIMIT) {
      console.warn(
        `[whatsapp] Tageslimit (${TAGESLIMIT}/24h) erreicht — Benachrichtigung übersprungen.`,
      );
      return;
    }
  }

  // Opt-in-Owner/Admins dieses Clubs MIT hinterlegter Nummer. Der Join gegen
  // role_assignments stellt sicher, dass die Person NOCH Owner/Admin ist.
  const empfaenger = await db
    .select({
      userId: whatsappOptin.userId,
      nummer: userSettings.whatsappNummer,
    })
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

  // Cooldown: Empfänger ausblenden, die zu DIESER Maschine im Fenster bereits
  // (erfolgreich ODER als Versuch) benachrichtigt wurden — ein Versuch startet
  // den Cooldown bewusst mit, damit ein dauerhaft fehlschlagender Empfänger
  // keinen Retry-Sturm auslöst.
  const seit = new Date(Date.now() - COOLDOWN_MINUTEN * 60_000);
  const kuerzlich = await db
    .select({ userId: whatsappLog.recipientUserId })
    .from(whatsappLog)
    .where(
      and(
        eq(whatsappLog.machineId, fault.machineId),
        gte(whatsappLog.gesendetAm, seit),
        isNotNull(whatsappLog.recipientUserId),
      ),
    );
  const gesperrt = new Set(kuerzlich.map((r) => r.userId));

  const ziele = empfaenger.filter(
    (e): e is { userId: string; nummer: string } =>
      Boolean(e.nummer) && !gesperrt.has(e.userId),
  );
  if (ziele.length === 0) return;

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
  await Promise.allSettled(
    ziele.map((z) =>
      sendeWhatsapp({
        an: z.nummer,
        faultId: fault.id,
        machineId: fault.machineId,
        recipientUserId: z.userId,
        ...inhalt,
      }),
    ),
  );
}
