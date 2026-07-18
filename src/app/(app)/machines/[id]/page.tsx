import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { FaultList } from "@/components/fault-list";
import { MachineDataTables } from "@/components/machine-data-tables";
import { ManualUpload } from "@/components/manual-upload";
import { RepairList } from "@/components/repair-list";
import { ShareFactsForm } from "@/components/share-facts-form";
import { SharedFacts } from "@/components/shared-facts";
import { Card } from "@/components/ui/card";
import { deleteMachine } from "@/db/actions/machines";
import { db } from "@/db";
import {
  getFactsShare,
  getSharedFactsForModel,
  getUserClubs,
} from "@/db/queries";
import {
  faults as faultsTable,
  machineData as machineDataTable,
  repairs as repairsTable,
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
  const machineFaults = await db.query.faults.findMany({
    where: aktiverFilter
      ? and(
          eq(faultsTable.machineId, id),
          eq(
            faultsTable.status,
            aktiverFilter as "offen" | "in Arbeit" | "behoben",
          ),
        )
      : eq(faultsTable.machineId, id),
    orderBy: [desc(faultsTable.datum)],
  });

  const machineRepairs = await db.query.repairs.findMany({
    where: eq(repairsTable.machineId, id),
    with: { fault: { columns: { beschreibung: true } } },
    orderBy: [desc(repairsTable.datum)],
  });

  // Phase-2-Fakten aus dem Handbuch (nur Fakten, kein PDF-Text gespeichert).
  const machineFacts = await db.query.machineData.findMany({
    where: eq(machineDataTable.machineId, id),
  });

  // Geteiltes Wissen zum selben Gerätetyp: eigene Freigabe + fremde Fakten,
  // die dieser Nutzer sehen darf. Ohne OPDB-Bezug gibt es keinen Typ.
  const eigeneFreigabe = machine.modelId ? await getFactsShare(id) : null;
  const geteilteFakten = machine.modelId
    ? await getSharedFactsForModel(currentUser, machine.modelId, id)
    : [];
  const meineClubs = await getUserClubs(currentUser.id);

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
          <Link
            href={`/machines/${machine.id}/edit`}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-border)]/40"
          >
            <Pencil size={15} /> Bearbeiten
          </Link>
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

      {/* Handbuch-Daten / Service-Fakten (Phase 2).
          Full-Bleed: dieser Abschnitt bricht aus der 5xl-Spalte aus und nutzt bis
          zu ~1440px, damit die Switch-/Lamp-Matrizen genug Breite haben. Der Rest
          der Seite (Formulare, Listen) bleibt bewusst schmal. */}
      <section className="mx-[calc(50%-50vw)] px-4 sm:px-6">
        <div className="mx-auto max-w-[1440px] space-y-3">
          <h2 className="text-lg font-semibold">Handbuch-Daten</h2>
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
                    ? {
                        scope: eigeneFreigabe.scope,
                        anonym: eigeneFreigabe.anonym,
                      }
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

          <Card className="space-y-3">
            <p className="text-sm text-[var(--color-muted)]">
              Lade dein eigenes Handbuch hoch, um Referenztabellen (Spulen,
              Lampen-/Schalter-Matrix, Sicherungen, Teile, Regeln) zu extrahieren.
              Das PDF wird dabei nicht gespeichert — nur die extrahierten Fakten.
            </p>
            <ManualUpload machineId={machine.id} />
          </Card>
        </div>
      </section>

      {/* Fehler */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Fehler</h2>
          <Link
            href={`/machines/${machine.id}/faults/new`}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
          >
            <Plus size={15} /> Neuer Fehler
          </Link>
        </div>

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

        <FaultList faults={machineFaults} machineId={machine.id} />
      </section>

      {/* Reparaturen */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Reparaturen</h2>
          <Link
            href={`/machines/${machine.id}/repairs/new`}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
          >
            <Plus size={15} /> Neue Reparatur
          </Link>
        </div>
        <RepairList repairs={machineRepairs} machineId={machine.id} />
      </section>
    </div>
  );
}
