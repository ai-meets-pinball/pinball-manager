import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  getLetzteWartung,
  getMachineFaults,
  getMachineGuides,
  getMachineKnowledge,
  getMaintenanceTasks,
  getModelGeneration,
  getModelGuides,
  getModelKnowledge,
  getNeueFehlerSeitGestern,
  getRepairShares,
  getShareDefaults,
  getSharedRepairsForModel,
  getUserClubs,
} from "@/db/queries";
import {
  clubs as clubsTable,
  maintenancePlans as maintenancePlansTable,
  repairs as repairsTable,
} from "@/db/schema";
import { requireMachineAccess } from "@/lib/session";

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

  // Reihenfolge wie zuvor in der Seite — dieser Schritt verschiebt nur.
  // requireMachineAccess lädt die Maschine bereits; hier fehlt nur der
  // Club-Name, und den auch nur für Club-Maschinen (vorher wurde dafür die
  // ganze Maschine ein zweites Mal geladen).
  const club = machine.clubId
    ? ((await db.query.clubs.findFirst({
        where: eq(clubsTable.id, machine.clubId),
        columns: { name: true },
      })) ?? null)
    : null;
  const alleFehler = await getMachineFaults(id);
  const letzteWartung = await getLetzteWartung(id);
  const deltaFehler = await getNeueFehlerSeitGestern(id);
  // Reparaturen samt ihrer behobenen Fehler (n:m, Datenmodell Phase 3).
  const repairsRoh = await db.query.repairs.findMany({
    where: eq(repairsTable.machineId, id),
    with: {
      repairFaults: { with: { fault: { columns: { beschreibung: true } } } },
    },
    orderBy: [desc(repairsTable.datum)],
  });
  // Handbuch-Fakten und Guides sind MODELL-Wissen (Datenmodell Phase 1+2).
  // Ohne Modell fällt beides auf die Maschinen-Ebene zurück.
  const fakten = machine.modelId
    ? await getModelKnowledge(user, machine.modelId)
    : await getMachineKnowledge(user, id);
  const guides = machine.modelId
    ? await getModelGuides(user, machine.modelId)
    : await getMachineGuides(user, id);
  // Generation des Modells — erlaubt einen Guide für die ganze Board-/
  // Hardware-Generation statt nur für dieses Modell.
  const generation = machine.modelId
    ? await getModelGeneration(machine.modelId)
    : null;
  const wartungsTasks = await getMaintenanceTasks(id);
  // Verknüpfter Standard-Wartungsplan (oder null = eigener Plan/Kopie).
  const wartungsStandard = machine.maintenancePlanId
    ? ((await db.query.maintenancePlans.findFirst({
        where: eq(maintenancePlansTable.id, machine.maintenancePlanId),
        columns: { name: true },
      })) ?? null)
    : null;
  const geteilteReparaturen = machine.modelId
    ? await getSharedRepairsForModel(user, machine.modelId, id)
    : [];
  const meineClubs = await getUserClubs(user.id);
  const shareDefaults = await getShareDefaults(machine);
  const repairShares = await getRepairShares(id);

  const offene = alleFehler.filter((f) => f.status !== "behoben");

  return {
    user,
    darf,
    machine: { ...machine, club },
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
    },
    wissen: {
      fakten,
      guides,
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
