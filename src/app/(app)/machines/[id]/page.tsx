import { desc, eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { FaultList } from "@/components/fault-list";
import { MachineDataTables } from "@/components/machine-data-tables";
import { MachineOverview, type MachineKpi } from "@/components/machine-overview";
import { MachineTabs, type MachineTab } from "@/components/machine-tabs";
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
import { availableProviders } from "@/lib/ai/provider";

// KI-Server-Actions dieser Route (z. B. Troubleshooting-Guide) können Minuten
// dauern → auf Vercel das Default-Timeout anheben (max. 300s auf Pro; lokal ohne
// Wirkung). Die Handbuch-Extraktion selbst läuft separat in der streamenden
// API-Route /api/machines/[id]/extract-manual.
export const maxDuration = 300;

const FAULT_FILTER = ["alle", "offen", "in Arbeit", "behoben"] as const;

// Die Detailseite ist in Reiter (?bereich=<Blatt>) gegliedert statt in einen langen
// Panel-Stapel — server-gerendert wie die Fehler-Status-Pills, also deep-linkbar und
// reload-fest. Die Blätter sind zweistufig gruppiert (siehe `gruppen` unten);
// „uebersicht" ist der Startreiter (Status-Dashboard).
const LEAF_LABEL = {
  uebersicht: "Übersicht",
  fehler: "Fehler",
  wartung: "Wartung",
  reparaturen: "Reparaturen",
  handbuch: "Handbuch",
  guide: "Guide",
} as const;
type Leaf = keyof typeof LEAF_LABEL;

// Kompakte Zähl-Pill für die Reiter-Badges (gleiche Farblogik wie zuvor die
// Section-Badges: warn = offene Fehler, danger = überfällige Wartung).
function CountPill({
  n,
  tone = "neutral",
}: {
  n: number | string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const cls = {
    neutral: "border-[var(--color-border)] text-[var(--color-muted)]",
    warn: "border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 text-[var(--color-warn)]",
    danger:
      "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[tone];
  return (
    <span
      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}
    >
      {n}
    </span>
  );
}

export default async function MachineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ faultStatus?: string; bereich?: string }>;
}) {
  const { id } = await params;
  const { faultStatus, bereich } = await searchParams;
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

  // KI-Funktionen: welche Anbieter stehen zur Wahl? Sind beide verfügbar (lokales
  // Ollama UND Claude), darf der Nutzer je Aktion bewusst wählen. Ohne zentralen
  // Anthropic-Key blendet der Claude-Weg ein ephemeres BYO-Feld ein (nur für den
  // Request, nicht gespeichert).
  const kiProviders = availableProviders();
  const kiCentralKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const ollamaVerfuegbar = kiProviders.includes("ollama");

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

  // Der Guide erscheint erst, wenn es Handbuch-Fakten oder einen Guide gibt.
  const guideSichtbar = machineFacts.length > 0 || Boolean(troubleshootingGuide);

  // Zwei-Ebenen-Navigation: „Betrieb" = aktueller Zustand (Fehler, Wartung),
  // „Wissensbasis" = angesammeltes Wissen (Reparatur-Historie/DB, Handbuch-Fakten,
  // Guide). So sind mobil nie mehr als drei Reiter nebeneinander. Das ?bereich=
  // bleibt das einzelne Blatt (deep-linkbar); die Gruppe leitet sich daraus ab.
  const gruppen: { key: string; label: string; leaves: Leaf[] }[] = [
    { key: "uebersicht", label: "Übersicht", leaves: ["uebersicht"] },
    { key: "betrieb", label: "Betrieb", leaves: ["fehler", "wartung"] },
    {
      key: "wissen",
      label: "Wissensbasis",
      leaves: guideSichtbar
        ? ["reparaturen", "handbuch", "guide"]
        : ["reparaturen", "handbuch"],
    },
  ];

  // Aktives Blatt aus der URL. Fallback: Fehler bei aktivem Fehlerfilter (alte
  // ?faultStatus=-Deep-Links), sonst Übersicht. Unbekanntes/unsichtbares → Übersicht.
  const gewuenscht = bereich ?? (faultStatus ? "fehler" : "uebersicht");
  const sichtbareLeaves = new Set<string>(gruppen.flatMap((g) => g.leaves));
  const active: Leaf = sichtbareLeaves.has(gewuenscht)
    ? (gewuenscht as Leaf)
    : "uebersicht";
  const aktiveGruppe = gruppen.find((g) => g.leaves.includes(active))!;

  // Status-Badges je Blatt (dieselben Zähler/Farben wie zuvor die Section-Badges).
  const leafBadge: Record<Leaf, ReactNode> = {
    uebersicht: undefined,
    fehler:
      fehlerOffen > 0 ? (
        <CountPill n={fehlerOffen} tone="warn" />
      ) : fehlerGesamt > 0 ? (
        <CountPill n={fehlerGesamt} />
      ) : undefined,
    wartung:
      wartungFaellig > 0 ? (
        <CountPill n={wartungFaellig} tone="danger" />
      ) : wartungBald > 0 ? (
        <CountPill n={wartungBald} tone="warn" />
      ) : undefined,
    reparaturen:
      machineRepairs.length > 0 ? (
        <CountPill n={machineRepairs.length} />
      ) : undefined,
    handbuch:
      machineFacts.length > 0 ? (
        <CountPill n={machineFacts.length} />
      ) : undefined,
    guide: undefined,
  };

  // Haupt-Gruppen: Badge zeigt die dringendste Lage der enthaltenen Blätter,
  // damit man Fälliges/Offenes auch aus einer anderen Gruppe heraus sieht.
  const gruppeBadge: Record<string, ReactNode> = {
    uebersicht: undefined,
    betrieb:
      wartungFaellig > 0 ? (
        <CountPill n={wartungFaellig} tone="danger" />
      ) : fehlerOffen > 0 ? (
        <CountPill n={fehlerOffen} tone="warn" />
      ) : undefined,
    wissen: undefined,
  };

  const primary: MachineTab[] = gruppen.map((g) => ({
    key: g.key,
    label: g.label,
    href: `/machines/${machine.id}?bereich=${g.leaves[0]}`,
    active: g.key === aktiveGruppe.key,
    badge: gruppeBadge[g.key],
  }));

  // Unterreihe nur, wenn die aktive Gruppe mehr als ein Blatt hat.
  const secondary: MachineTab[] | undefined =
    aktiveGruppe.leaves.length > 1
      ? aktiveGruppe.leaves.map((leaf) => ({
          key: leaf,
          label: LEAF_LABEL[leaf],
          href: `/machines/${machine.id}?bereich=${leaf}`,
          active: leaf === active,
          badge: leafBadge[leaf],
        }))
      : undefined;

  // KPI-Karten der Übersicht (klickbar → öffnen den jeweiligen Reiter).
  const kpis: MachineKpi[] = [
    {
      key: "fehler",
      zahl: fehlerGesamt,
      label: fehlerOffen > 0 ? `${fehlerOffen} offen` : "Fehler",
      tone: fehlerOffen > 0 ? "warn" : "neutral",
    },
    {
      key: "reparaturen",
      zahl: machineRepairs.length,
      label: "Reparaturen",
      tone: "neutral",
    },
    {
      key: "wartung",
      zahl:
        wartungFaellig > 0
          ? wartungFaellig
          : wartungBald > 0
            ? wartungBald
            : wartungsTasks.length,
      label:
        wartungFaellig > 0
          ? "fällig"
          : wartungBald > 0
            ? "bald fällig"
            : "Wartung",
      tone: wartungFaellig > 0 ? "danger" : wartungBald > 0 ? "warn" : "neutral",
    },
    {
      key: "handbuch",
      zahl: machineFacts.length,
      label: machineFacts.length > 0 ? "Technische Daten" : "Handbuch",
      tone: "neutral",
    },
    ...(guideSichtbar
      ? [
          {
            key: "guide",
            zahl: troubleshootingGuide ? "✓" : "–",
            label: "Guide",
            tone: "neutral",
          } as MachineKpi,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Kopf: Identität der Maschine + schreibende Aktionen — immer sichtbar. */}
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

      {/* Reiterleiste (klebt unter dem Header). Der aktive Bereich steht in der URL. */}
      <MachineTabs primary={primary} secondary={secondary} />

      {/* ── Übersicht: Foto, OPDB/IPDB und Status-Dashboard ──────────────────── */}
      {active === "uebersicht" ? (
        <MachineOverview
          machineId={machine.id}
          fotoUrl={machine.fotoUrl}
          fotoAlt={`${machine.hersteller} ${machine.modell}`}
          opdbRef={machine.opdbRef}
          ipdbRef={machine.ipdbRef}
          kpis={kpis}
        />
      ) : null}

      {/* ── Fehler ───────────────────────────────────────────────────────────── */}
      {active === "fehler" ? (
        <div className="space-y-3">
          {darf.bearbeiten ? (
            <Link
              href={`/machines/${machine.id}/faults/new`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
            >
              <Plus size={15} /> Neuer Fehler
            </Link>
          ) : null}

          {/* Statusfilter — hält den Reiter (bereich=fehler) und setzt ?faultStatus=. */}
          <div className="flex flex-wrap gap-2 text-sm">
            {FAULT_FILTER.map((f) => {
              const aktiv = (faultStatus ?? "alle") === f;
              return (
                <Link
                  key={f}
                  href={
                    f === "alle"
                      ? `/machines/${machine.id}?bereich=fehler`
                      : `/machines/${machine.id}?bereich=fehler&faultStatus=${encodeURIComponent(f)}`
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
      ) : null}

      {/* ── Reparaturen (inkl. eingefalteter geteilter Reparaturen) ───────────── */}
      {active === "reparaturen" ? (
        <div className="space-y-6">
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

          {/* Reparaturdatenbank: von anderen Besitzern desselben Gerätetyps
              geteilte Reparaturen (nur wenn vorhanden). */}
          {geteilteReparaturen.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Geteilte Reparaturen</h2>
              <SharedRepairs eintraege={geteilteReparaturen} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Wartungsplan ─────────────────────────────────────────────────────── */}
      {active === "wartung" ? (
        <MaintenancePlan
          tasks={wartungsTasks}
          machineId={machine.id}
          schreibbar={darf.bearbeiten}
          hatGuide={troubleshootingGuide !== undefined}
          providers={kiProviders}
          centralKey={kiCentralKey}
        />
      ) : null}

      {/* ── Handbuch-Daten (Phase 2) ─────────────────────────────────────────── */}
      {/* fullBleed: bricht aus der schmalen Spalte aus (bis ~1440px), damit die
          Switch-/Lamp-Matrizen genug Breite haben. */}
      {active === "handbuch" ? (
        <section className="mx-[calc(50%-50vw)] px-4 sm:px-6">
          <div className="mx-auto max-w-[1440px] space-y-3">
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

            {darf.bearbeiten ? (
              <Card className="space-y-3">
                <p className="text-sm text-[var(--color-muted)]">
                  Lade dein eigenes Handbuch hoch, um Referenztabellen (Spulen,
                  Lampen-/Schalter-Matrix, Sicherungen, Teile, Regeln) zu
                  extrahieren. Das PDF wird dabei nicht gespeichert — nur die
                  extrahierten Fakten.
                </p>
                <ManualUpload
                  machineId={machine.id}
                  providers={kiProviders}
                  centralKey={kiCentralKey}
                />
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── Troubleshooting-Guide (Phase 3) ──────────────────────────────────── */}
      {active === "guide" && guideSichtbar ? (
        <div className="space-y-3">
          {troubleshootingGuide ? (
            <TroubleshootingGuideView
              daten={troubleshootingGuide.daten}
              model={troubleshootingGuide.model}
              websuche={troubleshootingGuide.websuche}
              createdAt={troubleshootingGuide.createdAt}
            />
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Erzeuge aus Hersteller, Modell und Baujahr einen umfassenden FAQ-
              und Troubleshooting-Guide (Plattform-Erkennung, Fehlersuche nach
              Subsystemen, bekannte Serienfehler, Wartung).{" "}
              Claude prüft dabei Plattform und Serienprobleme per Websuche gegen
              Community-Quellen.
              {ollamaVerfuegbar
                ? " Das lokale Modell (Ollama) arbeitet ohne Websuche — der Guide wird dann entsprechend gekennzeichnet."
                : ""}
            </p>
          )}

          {darf.bearbeiten ? (
            <TroubleshootingGenerate
              machineId={machine.id}
              vorhanden={troubleshootingGuide !== undefined}
              providers={kiProviders}
              centralKey={kiCentralKey}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
