import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  getClubPlans,
  getLetzteWartung,
  getMachineAusstattung,
  getMachineBesitzer,
  getMachineDokumente,
  getMachineFaults,
  getMachineGuides,
  getMachineKnowledge,
  getMachineTermine,
  getMaintenanceTasks,
  getModelGeneration,
  getModelGuides,
  getModelKnowledge,
  getModelTipps,
  getNeueFehlerSeitGestern,
  getRepairShares,
  getShareDefaults,
  getSharedRepairsForModel,
  getUserClubs,
  getUserPlans,
} from "@/db/queries";
import {
  clubs as clubsTable,
  maintenancePlans as maintenancePlansTable,
  repairs as repairsTable,
} from "@/db/schema";
import { darfClub } from "@/lib/rechte";
import { getClubRole, requireMachineAccess } from "@/lib/session";

/*
  Alles, was die Maschinen-Detailseite anzeigt — hinter einem Aufruf.

  Vorher lud die Seite dreizehn Dinge nacheinander selbst, griff dabei zweimal
  direkt aufs ORM zu und wiederholte an vier Stellen dieselbe Regel: Wissen
  hängt am MODELL, die Maschinen-Ebene ist der Sonderfall für Geräte ohne
  Modell. Diese Regel gehört hierher, nicht in die Ansicht.

  Invarianten, auf die sich Aufrufer verlassen dürfen:
  - Der Zugriff ist geprüft (requireMachineAccess) — wer keinen hat, kommt hier
    nicht heraus, sondern in notFound() bzw. einen Fehler.
  - Die Zähler passen zu den Listen, aus denen sie stammen.
*/

export type MachineDetail = Awaited<ReturnType<typeof getMachineDetail>>;

export async function getMachineDetail(id: string) {
  // Autorisierung: Eigentum ODER Club-Mitgliedschaft (kein RLS). `darf` trägt
  // die Berechtigungsstufe, damit die UI dieselben Regeln zeigt, die die
  // Server Actions durchsetzen.
  const { user, machine, darf } = await requireMachineAccess(id);

  // Keiner dieser Schritte braucht das Ergebnis eines anderen — alles hängt
  // nur an `id`, `user` und der bereits geladenen Maschine. Der Treiber hält
  // standardmäßig zehn Verbindungen, der Rest reiht sich ein.
  const [
    club,
    besitzer,
    clubRolle,
    alleFehler,
    letzteWartung,
    deltaFehler,
    repairsRoh,
    fakten,
    guides,
    tipps,
    generation,
    wartungsTasks,
    wartungsStandard,
    geteilteReparaturen,
    meineClubs,
    shareDefaults,
    repairShares,
    ausstattung,
    geraeteTermine,
    geraeteDokumente,
  ] = await Promise.all([
    // requireMachineAccess lädt die Maschine bereits; hier fehlt nur der
    // Club-Name, und den auch nur für Club-Maschinen.
    machine.clubId
      ? db.query.clubs
          .findFirst({
            where: eq(clubsTable.id, machine.clubId),
            columns: { name: true },
          })
          .then((c) => c ?? null)
      : null,
    // Tatsächliche Besitzer (n:m — ein Gerät kann mehrere haben), rein
    // informativ, siehe Schema.
    getMachineBesitzer(id),
    // Club-Rolle des Betrachters — für die Frage „darf er den Besitzer einladen?".
    machine.clubId ? getClubRole(user.id, machine.clubId) : null,
    getMachineFaults(id),
    getLetzteWartung(id),
    getNeueFehlerSeitGestern(id),
    // Reparaturen samt ihrer behobenen Fehler (n:m, Datenmodell Phase 3).
    db.query.repairs.findMany({
      where: eq(repairsTable.machineId, id),
      with: {
        repairFaults: { with: { fault: { columns: { beschreibung: true } } } },
      },
      orderBy: [desc(repairsTable.datum)],
    }),
    // Handbuch-Fakten und Guides sind MODELL-Wissen (Datenmodell Phase 1+2).
    // Ohne Modell fällt beides auf die Maschinen-Ebene zurück.
    machine.modelId
      ? getModelKnowledge(user, machine.modelId)
      : getMachineKnowledge(user, id),
    machine.modelId
      ? getModelGuides(user, machine.modelId)
      : getMachineGuides(user, id),
    // Allgemeine Tipps hängen n:m an Modellen/Generationen — ohne Modell gibt
    // es keinen Anker (Tipps sind nie maschinenbezogen).
    machine.modelId ? getModelTipps(user, machine.modelId) : [],
    // Generation des Modells — erlaubt einen Guide für die ganze Board-/
    // Hardware-Generation statt nur für dieses Modell.
    machine.modelId ? getModelGeneration(machine.modelId) : null,
    getMaintenanceTasks(id),
    // Verknüpfter Standard-Wartungsplan (oder null = eigener Plan/Kopie).
    machine.maintenancePlanId
      ? db.query.maintenancePlans
          .findFirst({
            where: eq(maintenancePlansTable.id, machine.maintenancePlanId),
            columns: { name: true },
          })
          .then((p) => p ?? null)
      : null,
    machine.modelId ? getSharedRepairsForModel(user, machine.modelId, id) : [],
    getUserClubs(user.id),
    getShareDefaults(machine),
    getRepairShares(id),
    getMachineAusstattung(id),
    getMachineTermine(id),
    getMachineDokumente(id),
  ]);

  const offene = alleFehler.filter((f) => f.status !== "behoben");

  // Verknüpfbare Wartungspläne fürs Picker-Dropdown: eigene + die der Clubs des
  // Nutzers, gruppiert (Mehrfach-Pläne je Besitzer).
  const linkbarePlaene = [
    ...(await getUserPlans(user.id)).map((p) => ({
      ...p,
      gruppe: "Meine Pläne",
    })),
    ...(
      await Promise.all(
        meineClubs.map(async (c) =>
          (await getClubPlans(c.id)).map((p) => ({
            ...p,
            gruppe: `Standard ${c.name}`,
          })),
        ),
      )
    ).flat(),
  ];

  return {
    user,
    darf,
    machine: { ...machine, club },
    // Besitzer-Liste, je Eintrag mit der Frage, ob der Betrachter ihn in den
    // Club einladen darf (Club-Maschine, E-Mail vorhanden, noch kein Konto
    // verknüpft, Betrachter ist Club-Owner/-Admin). Die Server Action prüft
    // dieselbe Regel erneut.
    besitzer: besitzer.map((b) => ({
      ...b,
      einladbar: Boolean(
        machine.clubId &&
        b.email &&
        !b.userId &&
        darfClub(user, clubRolle).verwalten,
      ),
    })),
    ausstattung,
    termine: geraeteTermine,
    dokumente: geraeteDokumente,
    fehler: {
      alle: alleFehler,
      offen: offene,
      gesamt: alleFehler.length,
      anzahlOffen: offene.length,
      anzahlKritischOffen: offene.filter((f) => f.prioritaet === "kritisch")
        .length,
      deltaSeitGestern: deltaFehler,
    },
    wartung: {
      tasks: wartungsTasks,
      standard: wartungsStandard,
      letzte: letzteWartung,
      anzahlFaellig: wartungsTasks.filter((t) => t.status === "faellig").length,
      anzahlBald: wartungsTasks.filter((t) => t.status === "bald").length,
      plaene: linkbarePlaene,
    },
    wissen: {
      fakten,
      guides,
      tipps,
      generation,
      eigenerGuide: guides.some((g) => g.autorId === user.id),
    },
    reparaturen: {
      eigene: repairsRoh.map((r) => ({
        ...r,
        faults: r.repairFaults.map((rf) => rf.fault),
      })),
      geteilte: geteilteReparaturen,
      shares: repairShares,
    },
    teilen: {
      meineClubs,
      defaults: shareDefaults,
    },
  };
}
