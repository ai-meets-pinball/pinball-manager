import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { FaultList } from "@/components/fault-list";
import { MachineDataTables } from "@/components/machine-data-tables";
import { MaintenancePlan } from "@/components/maintenance-plan";
import { ManualUpload } from "@/components/manual-upload";
import { RepairList } from "@/components/repair-list";
import { ShareFactsForm } from "@/components/share-facts-form";
import { SharedFacts } from "@/components/shared-facts";
import { SharedRepairs } from "@/components/shared-repairs";
import { TroubleshootingGenerate } from "@/components/troubleshooting-generate";
import { TroubleshootingGuideView } from "@/components/troubleshooting-guide";
import { Card } from "@/components/ui/card";
import { deleteMachine } from "@/db/actions/machines";
import { db } from "@/db";
import {
  getFactsShare,
  getMaintenanceTasks,
  getRepairShares,
  getShareDefaults,
  getSharedFactsForModel,
  getSharedRepairsForModel,
  getUserClubs,
} from "@/db/queries";
import {
  faults as faultsTable,
  machineData as machineDataTable,
  repairs as repairsTable,
  troubleshootingGuides as troubleshootingGuidesTable,
} from "@/db/schema";
import { requireMachineAccess } from "@/lib/session";

// Die Handbuch-Extraktion (Server Action extractManualFacts) läuft in der
// Function dieser Route und kann bei großen PDFs Minuten dauern → auf Vercel
// das Default-Timeout anheben (max. 300s auf Pro; lokal ohne Wirkung).
export const maxDuration = 300;

const FAULT_FILTER = ["alle", "offen", "in Arbeit", "behoben"] as const;

export default async function MachineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ faultStatus?: string }>;
}) {
  const { id } = await params;
  const { faultStatus } = await searchParams;
  // Autorisierung: Eigentum ODER Club-Mitgliedschaft (kein RLS).
  // `darf` trägt die Berechtigungsstufe, damit die UI dieselben Regeln zeigt,
  // die die Server Actions durchsetzen.
  const { user: currentUser, darf } = await requireMachineAccess(id);

  const machine = await db.query.machines.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: { club: { columns: { name: true } } },
  });
  if (!machine) return null; // requireMachineAccess hat bereits notFound() geprüft

  // Optionaler Statusfilter für Fehler (PRD §4.2: „offene Fehler je Maschine").
  const aktiverFilter =
    faultStatus && faultStatus !== "alle" ? faultStatus : undefined;
  // Alle Fehler laden (für die Badge-Zähler); die angezeigte Liste bei aktivem
  // Statusfilter in-memory filtern, damit die Zähler unabhängig vom Filter stimmen.
  const alleFehler = await db.query.faults.findMany({
    where: eq(faultsTable.machineId, id),
    orderBy: [desc(faultsTable.datum)],
  });
  const machineFaults = aktiverFilter
    ? alleFehler.filter((f) => f.status === aktiverFilter)
    : alleFehler;
  const fehlerGesamt = alleFehler.length;
  const fehlerOffen = alleFehler.filter((f) => f.status !== "behoben").length;

  const machineRepairs = await db.query.repairs.findMany({
    where: eq(repairsTable.machineId, id),
    with: { fault: { columns: { beschreibung: true } } },
    orderBy: [desc(repairsTable.datum)],
  });

  // Phase-2-Fakten aus dem Handbuch (nur Fakten, kein PDF-Text gespeichert).
  const machineFacts = await db.query.machineData.findMany({
    where: eq(machineDataTable.machineId, id),
  });

  // Phase-3-Troubleshooting-Guide (genau einer je Maschine, falls erzeugt).
  const troubleshootingGuide = await db.query.troubleshootingGuides.findFirst({
    where: eq(troubleshootingGuidesTable.machineId, id),
  });

  // Wartungsplan: Wartungspunkte samt Historie und berechneter Fälligkeit.
  const wartungsTasks = await getMaintenanceTasks(id);
  const wartungFaellig = wartungsTasks.filter(
    (t) => t.status === "ueberfaellig",
  ).length;
  const wartungBald = wartungsTasks.filter((t) => t.status === "bald").length;

  // Geteiltes Wissen zum selben Gerätetyp: eigene Freigabe + fremde Fakten,
  // die dieser Nutzer sehen darf. Ohne OPDB-Bezug gibt es keinen Typ.
  const eigeneFreigabe = machine.modelId ? await getFactsShare(id) : null;
  const geteilteFakten = machine.modelId
    ? await getSharedFactsForModel(currentUser, machine.modelId, id)
    : [];
  const geteilteReparaturen = machine.modelId
    ? await getSharedRepairsForModel(currentUser, machine.modelId, id)
    : [];
  const meineClubs = await getUserClubs(currentUser.id);
  const shareDefaults = await getShareDefaults(machine);
  const repairShares = await getRepairShares(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {machine.hersteller} {machine.modell}
          </h1>
          <p className="text-[var(--color-muted)]">
            {machine.baujahr ?? "Baujahr unbekannt"}
          </p>
          {machine.club ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-[var(--color-muted)]">
              <Users size={14} /> {machine.club.name}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {/* Schreibende Bedienelemente nur, wenn der Nutzer auch schreiben darf
              (Supporter haben nur Lesezugriff). */}
          {darf.bearbeiten ? (
            <Link
              href={`/machines/${machine.id}/edit`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-border)]/40"
            >
              <Pencil size={15} /> Bearbeiten
            </Link>
          ) : null}
          {/* Nur zeigen, wenn deleteMachine es auch zulässt (Eigentümer,
              Club-Manager, Super-Admin) — sonst ein Knopf, der garantiert
              in einen Fehler läuft. */}
          {darf.loeschen ? (
            <form action={deleteMachine}>
              <input type="hidden" name="id" value={machine.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/40 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                <Trash2 size={15} /> Löschen
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {machine.fotoUrl ? (
        <Card className="overflow-hidden p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={machine.fotoUrl}
            alt={`${machine.hersteller} ${machine.modell}`}
            className="max-h-80 w-full object-cover"
          />
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {machine.opdbRef ? (
          <Card>
            <p className="text-xs text-[var(--color-muted)]">OPDB</p>
            <p>{machine.opdbRef}</p>
          </Card>
        ) : null}
        {machine.ipdbRef ? (
          <Card>
            <p className="text-xs text-[var(--color-muted)]">IPDB</p>
            <p>{machine.ipdbRef}</p>
          </Card>
        ) : null}
      </div>

      {/* ── Betrieb: Fehler & Reparaturen (nach oben, prominent) ──────────── */}

      {/* Fehler — öffnet automatisch, wenn ein Statusfilter aktiv ist, damit das
          Panel nach dem Server-Reload durch einen Filterklick offen bleibt. */}
      <CollapsibleSection
        title="Fehler"
        defaultOpen={aktiverFilter !== undefined}
        badge={
          <span className="flex items-center gap-1.5 text-xs">
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-muted)]">
              {fehlerGesamt} gesamt
            </span>
            {fehlerOffen > 0 ? (
              <span className="rounded-full border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-2 py-0.5 text-[var(--color-warn)]">
                {fehlerOffen} offen
              </span>
            ) : null}
          </span>
        }
      >
        <div className="space-y-3">
          {darf.bearbeiten ? (
            <Link
              href={`/machines/${machine.id}/faults/new`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
            >
              <Plus size={15} /> Neuer Fehler
            </Link>
          ) : null}

          {/* Statusfilter — setzt nur den ?faultStatus=-Suchparameter (server-seitige Filterung). */}
          <div className="flex flex-wrap gap-2 text-sm">
            {FAULT_FILTER.map((f) => {
              const aktiv = (faultStatus ?? "alle") === f;
              return (
                <Link
                  key={f}
                  href={
                    f === "alle"
                      ? `/machines/${machine.id}`
                      : `/machines/${machine.id}?faultStatus=${encodeURIComponent(f)}`
                  }
                  className={`rounded-full border px-3 py-0.5 ${
                    aktiv
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  }`}
                >
                  {f}
                </Link>
              );
            })}
          </div>

          <FaultList
            faults={machineFaults}
            machineId={machine.id}
            schreibbar={darf.bearbeiten}
          />
        </div>
      </CollapsibleSection>

      {/* Reparaturen */}
      <CollapsibleSection
        title="Reparaturen"
        badge={
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
            {machineRepairs.length}
          </span>
        }
      >
        <div className="space-y-3">
          {darf.bearbeiten ? (
            <Link
              href={`/machines/${machine.id}/repairs/new`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
            >
              <Plus size={15} /> Neue Reparatur
            </Link>
          ) : null}
          <RepairList
            repairs={machineRepairs}
            machineId={machine.id}
            schreibbar={darf.bearbeiten}
            teilen={
              darf.teilen && machine.modelId
                ? {
                    clubs: meineClubs.map((c) => ({ id: c.id, name: c.name })),
                    defaults: shareDefaults,
                    shares: Object.fromEntries(repairShares),
                  }
                : undefined
            }
          />
        </div>
      </CollapsibleSection>

      {/* Wartungsplan: interaktiv, mit Fälligkeit & Historie. Öffnet automatisch,
          wenn etwas überfällig ist. */}
      <CollapsibleSection
        title="Wartungsplan"
        defaultOpen={wartungFaellig > 0}
        badge={
          wartungFaellig > 0 || wartungBald > 0 ? (
            <span className="flex items-center gap-1.5 text-xs">
              {wartungFaellig > 0 ? (
                <span className="rounded-full border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-2 py-0.5 text-[var(--color-danger)]">
                  {wartungFaellig} fällig
                </span>
              ) : null}
              {wartungBald > 0 ? (
                <span className="rounded-full border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-2 py-0.5 text-[var(--color-warn)]">
                  {wartungBald} bald
                </span>
              ) : null}
            </span>
          ) : undefined
        }
      >
        <MaintenancePlan
          tasks={wartungsTasks}
          machineId={machine.id}
          schreibbar={darf.bearbeiten}
          hatGuide={troubleshootingGuide !== undefined}
        />
      </CollapsibleSection>

      {/* Reparaturdatenbank: geteiltes Wissen zum selben Gerätetyp (nur wenn vorhanden). */}
      {geteilteReparaturen.length > 0 ? (
        <CollapsibleSection
          title="Geteilte Reparaturen"
          badge={
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
              {geteilteReparaturen.length}
            </span>
          }
        >
          <SharedRepairs eintraege={geteilteReparaturen} />
        </CollapsibleSection>
      ) : null}

      {/* ── Referenz: Handbuch-Daten & Troubleshooting-Guide ──────────────── */}

      {/* Handbuch-Daten / Service-Fakten (Phase 2). fullBleed: nutzt bis ~1440px,
          damit die Switch-/Lamp-Matrizen genug Breite haben. */}
      <CollapsibleSection
        title="Handbuch-Daten"
        fullBleed
        badge={
          machineFacts.length > 0 ? (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
              {machineFacts.length} Tabellen
            </span>
          ) : undefined
        }
      >
        <div className="space-y-3">
          <MachineDataTables facts={machineFacts} />

          {/* Eigene Fakten teilen — nur wenn es welche gibt und ein Gerätetyp
              bekannt ist (ohne OPDB-Bezug fehlt der Anker zum Wiederfinden). */}
          {machineFacts.length > 0 && darf.teilen ? (
            <Card>
              <ShareFactsForm
                machineId={machine.id}
                hatModell={machine.modelId !== null}
                aktuell={
                  eigeneFreigabe
                    ? { scope: eigeneFreigabe.scope, anonym: eigeneFreigabe.anonym }
                    : null
                }
                clubs={meineClubs.map((c) => ({ id: c.id, name: c.name }))}
              />
            </Card>
          ) : null}

          {/* Von anderen Besitzern desselben Gerätetyps geteilte Fakten. */}
          <SharedFacts
            eintraege={geteilteFakten}
            eigeneVorhanden={machineFacts.length > 0}
          />

          {darf.bearbeiten ? (
            <Card className="space-y-3">
              <p className="text-sm text-[var(--color-muted)]">
                Lade dein eigenes Handbuch hoch, um Referenztabellen (Spulen,
                Lampen-/Schalter-Matrix, Sicherungen, Teile, Regeln) zu
                extrahieren. Das PDF wird dabei nicht gespeichert — nur die
                extrahierten Fakten.
              </p>
              <ManualUpload machineId={machine.id} />
            </Card>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* Troubleshooting-Guide (Phase 3): angeboten, sobald Handbuch-Fakten
          vorliegen (Lampenmatrix o. ä.) — oder wenn schon ein Guide existiert.
          Erzeugen darf, wer schreiben darf; ansehen jeder mit Lesezugriff. */}
      {machineFacts.length > 0 || troubleshootingGuide ? (
        <CollapsibleSection title="Troubleshooting-Guide">
          <div className="space-y-3">
            {troubleshootingGuide ? (
              <TroubleshootingGuideView
                daten={troubleshootingGuide.daten}
                model={troubleshootingGuide.model}
                createdAt={troubleshootingGuide.createdAt}
              />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Erzeuge aus Hersteller, Modell und Baujahr einen umfassenden FAQ-
                und Troubleshooting-Guide (Plattform-Erkennung, Fehlersuche nach
                Subsystemen, bekannte Serienfehler, Wartung). Claude prüft dabei
                Plattform und Serienprobleme per Websuche gegen Community-Quellen.
              </p>
            )}

            {darf.bearbeiten ? (
              <TroubleshootingGenerate
                machineId={machine.id}
                vorhanden={troubleshootingGuide !== undefined}
              />
            ) : null}
          </div>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
