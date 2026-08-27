import type { ReactNode } from "react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import Link from "next/link";
import { Boxes, ExternalLink, Pencil, Plus, QrCode, Trash2, Users } from "lucide-react";
import { BesitzerZeile } from "@/components/besitzer-zeile";
import { AusstattungListe } from "@/components/ausstattung-liste";
import { FaultList } from "@/components/fault-list";
import { KnowledgeFacts } from "@/components/knowledge-facts";
import { KnowledgeGuides } from "@/components/knowledge-guides";
import { KnowledgeTipps } from "@/components/knowledge-tipps";
import { TippForm } from "@/components/tipp-form";
import { MachineFaultsPreview } from "@/components/machine-faults-preview";
import {
  MachineOverview,
  type MachineKpi,
} from "@/components/machine-overview";
import { MachineTabs, type MachineTab } from "@/components/machine-tabs";
import { MaintenancePlan } from "@/components/maintenance-plan";
import { ManualExtract } from "@/components/manual-extract";
import { RepairList } from "@/components/repair-list";
import { SharedRepairs } from "@/components/shared-repairs";
import { StatusSeit } from "@/components/status-seit";
import { StatusSteuerung } from "@/components/status-steuerung";
import { TerminListe } from "@/components/termin-liste";
import { DokumenteListe } from "@/components/dokumente-liste";
import { CountPill } from "@/components/ui/count-pill";
import { TroubleshootingGenerate } from "@/components/troubleshooting-generate";
import { TroubleshootingJsonImport } from "@/components/troubleshooting-json-import";
import { Card } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteMachine } from "@/db/actions/machines";
import { getMachineDetail } from "@/db/machine-detail";
import { getTippZielKatalog, resolvePrompt } from "@/db/queries";
import { modellName, relativeZeit } from "@/lib/format";
import { tageDazwischen } from "@/lib/faelligkeit";
import { buildGuideImportPrompt } from "@/lib/import-guide";
import { kannKuratieren } from "@/lib/session";
import { availableProviders } from "@/lib/ai/provider";

// KI-Server-Actions dieser Route (z. B. Troubleshooting-Guide) können Minuten
// dauern → auf Vercel das Default-Timeout anheben (max. 300s auf Pro; lokal ohne
// Wirkung). Die Handbuch-Extraktion selbst läuft separat in der streamenden
// API-Route /api/machines/[id]/extract-manual.
export const maxDuration = 300;

const FAULT_FILTER = ["alle", "offen", "quittiert", "in Arbeit", "behoben"] as const;

// Die Detailseite ist in Reiter (?bereich=<Blatt>) gegliedert statt in einen langen
// Panel-Stapel — server-gerendert wie die Fehler-Status-Pills, also deep-linkbar und
// reload-fest. Die Blätter sind zweistufig gruppiert (siehe `gruppen` unten);
// „uebersicht" ist der Startreiter (Status-Dashboard).
const LEAF_LABEL = {
  uebersicht: "Übersicht",
  fehler: "Fehler",
  wartung: "Wartung",
  termine: "Termine",
  reparaturen: "Reparaturen",
  handbuch: "Handbuch",
  guide: "Guide",
  tipps: "Tipps",
  dokumente: "Dokumente",
} as const;
type Leaf = keyof typeof LEAF_LABEL;

export default async function MachineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ faultStatus?: string; bereich?: string }>;
}) {
  const { id } = await params;
  const { faultStatus, bereich } = await searchParams;
  // Laden UND Autorisierung liegen im Modul: was hier ankommt, ist freigegeben,
  // und die Zähler passen zu den Listen. `darf` trägt die Berechtigungsstufe,
  // damit die UI dieselben Regeln zeigt, die die Server Actions durchsetzen.
  const {
    user: currentUser,
    darf,
    machine,
    besitzer,
    ausstattung,
    fehler,
    wartung,
    termine,
    dokumente,
    wissen,
    reparaturen,
    teilen,
  } = await getMachineDetail(id);

  // Die Ansicht benutzt weiterhin die gewohnten Namen.
  const alleFehler = fehler.alle;
  const offeneFehler = fehler.offen;
  const fehlerGesamt = fehler.gesamt;
  const fehlerOffen = fehler.anzahlOffen;
  const fehlerKritischOffen = fehler.anzahlKritischOffen;
  const deltaFehler = fehler.deltaSeitGestern;
  const letzteWartung = wartung.letzte;
  const wartungsTasks = wartung.tasks;
  const wartungsStandard = wartung.standard;
  const wartungFaellig = wartung.anzahlFaellig;
  const wartungBald = wartung.anzahlBald;
  const knowledgeFacts = wissen.fakten;
  const guides = wissen.guides;
  const tipps = wissen.tipps;
  const eigenerGuide = wissen.eigenerGuide;
  const guideGeneration = wissen.generation;
  const machineRepairs = reparaturen.eigene;
  const geteilteReparaturen = reparaturen.geteilte;
  const repairShares = reparaturen.shares;
  const meineClubs = teilen.meineClubs;
  const shareDefaults = teilen.defaults;
  // Termine: Anzahl fälliger/überfälliger (heute oder früher) fürs Reiter-Badge.
  const termineFaellig = termine.filter(
    (t) => tageDazwischen(new Date(), t.datum) <= 0,
  ).length;

  // Optionaler Statusfilter für Fehler (PRD §4.2: „offene Fehler je Maschine").
  // Die angezeigte Liste wird in-memory gefiltert, damit die Zähler oben
  // unabhängig vom Filter stimmen.
  const aktiverFilter =
    faultStatus && faultStatus !== "alle" ? faultStatus : undefined;
  const machineFaults = aktiverFilter
    ? alleFehler.filter((f) => f.status === aktiverFilter)
    : alleFehler;

  // Ziel-Katalog für das Tipp-Anlege-Formular — nur wenn es gebraucht wird
  // (wie availableProviders eine Formular-Zutat, kein Anzeige-Datum der Maschine).
  const tippKatalog =
    darf.bearbeiten && machine.modelId ? await getTippZielKatalog() : null;

  // Kopierbarer Guide-Import-Prompt mit dem AUFGELÖSTEN System-Prompt
  // (Registry/Override), damit die Kopiervorlage denselben Text nutzt wie die
  // KI-Generierung. Nur für Bearbeiter (der Import-Block ist nur dort sichtbar).
  const guideImportPrompt = darf.bearbeiten
    ? buildGuideImportPrompt(
        machine,
        (
          await resolvePrompt("guide_system", {
            hersteller: machine.hersteller,
            generationId: guideGeneration?.id ?? null,
            vars: {
              hersteller: machine.hersteller,
              modell: machine.modell,
              baujahr: machine.baujahr ? String(machine.baujahr) : "unbekannt",
            },
          })
        ).text,
      )
    : null;

  // KI-Funktionen: welche Anbieter stehen zur Wahl? Sind beide verfügbar (lokales
  // Ollama UND Claude), darf der Nutzer je Aktion bewusst wählen. Ohne zentralen
  // Anthropic-Key blendet der Claude-Weg ein ephemeres BYO-Feld ein (nur für den
  // Request, nicht gespeichert).
  const kiProviders = availableProviders();
  const kiCentralKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const ollamaVerfuegbar = kiProviders.includes("ollama");

  // Der Guide-Reiter: für Bearbeiter immer sichtbar (Erzeugen/Importieren geht
  // auch ohne Handbuch-Fakten); Nur-Leser sehen ihn erst, wenn Inhalte existieren.
  const guideSichtbar =
    knowledgeFacts.length > 0 || guides.length > 0 || darf.bearbeiten;

  // Zwei-Ebenen-Navigation: „Betrieb" = aktueller Zustand (Fehler, Wartung),
  // „Wissensbasis" = angesammeltes Wissen (Reparatur-Historie/DB, Handbuch-Fakten,
  // Guide). So sind mobil nie mehr als drei Reiter nebeneinander. Das ?bereich=
  // bleibt das einzelne Blatt (deep-linkbar); die Gruppe leitet sich daraus ab.
  const gruppen: { key: string; label: string; leaves: Leaf[] }[] = [
    { key: "uebersicht", label: "Übersicht", leaves: ["uebersicht"] },
    {
      key: "betrieb",
      label: "Betrieb",
      leaves: ["fehler", "wartung", "termine"],
    },
    {
      key: "wissen",
      label: "Wissensbasis",
      leaves: guideSichtbar
        ? ["reparaturen", "handbuch", "guide", "tipps", "dokumente"]
        : ["reparaturen", "handbuch", "tipps", "dokumente"],
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
    termine:
      termineFaellig > 0 ? (
        <CountPill n={termineFaellig} tone="danger" />
      ) : termine.length > 0 ? (
        <CountPill n={termine.length} />
      ) : undefined,
    // Wissensbasis-Blätter zeigen ihre Bestandszahl immer — auch die 0, damit
    // man ohne Klick sieht, wo (noch) nichts liegt.
    reparaturen: <CountPill n={machineRepairs.length} />,
    handbuch: <CountPill n={knowledgeFacts.length} />,
    guide: <CountPill n={guides.length} />,
    tipps: <CountPill n={tipps.length} />,
    dokumente: <CountPill n={dokumente.length} />,
  };

  // Haupt-Gruppen: Badge zeigt die dringendste Lage der enthaltenen Blätter,
  // damit man Fälliges/Offenes auch aus einer anderen Gruppe heraus sieht.
  const gruppeBadge: Record<string, ReactNode> = {
    uebersicht: undefined,
    betrieb:
      wartungFaellig + termineFaellig > 0 ? (
        <CountPill n={wartungFaellig + termineFaellig} tone="danger" />
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

  // KPI-Karten der Übersicht (Dashboard). Verlinkte öffnen den jeweiligen Reiter.
  // Der Betriebsstatus hat eine EIGENE Karte oben (Status + Grund + Steuerung
  // an EINER Stelle) — bewusst keine separate KPI-Kachel mehr.
  const kpis: MachineKpi[] = [
    {
      key: "fehler-offen",
      href: `/machines/${machine.id}?bereich=fehler`,
      zahl: fehlerOffen,
      label: "Offene Fehler",
      tone: fehlerOffen > 0 ? "warn" : "neutral",
      sub:
        deltaFehler.gesamt > 0
          ? `↑ ${deltaFehler.gesamt} seit gestern`
          : undefined,
    },
    {
      key: "fehler-kritisch",
      href: `/machines/${machine.id}?bereich=fehler`,
      zahl: fehlerKritischOffen,
      label: "Kritische Fehler",
      tone: fehlerKritischOffen > 0 ? "danger" : "neutral",
      sub:
        deltaFehler.kritisch > 0
          ? `↑ ${deltaFehler.kritisch} seit gestern`
          : undefined,
    },
    {
      key: "wartung",
      href: `/machines/${machine.id}?bereich=wartung`,
      zahl: letzteWartung ? letzteWartung.toLocaleDateString("de-DE") : "—",
      label: "Letzte Wartung",
      tone:
        wartungFaellig > 0 ? "danger" : wartungBald > 0 ? "warn" : "success",
      sub: letzteWartung
        ? relativeZeit(letzteWartung)
        : wartungFaellig > 0
          ? `${wartungFaellig} fällig`
          : undefined,
    },
    {
      key: "reparaturen",
      href: `/machines/${machine.id}?bereich=reparaturen`,
      zahl: machineRepairs.length,
      label: "Reparaturen",
      tone: "neutral",
    },
    {
      key: "handbuch",
      href: `/machines/${machine.id}?bereich=handbuch`,
      zahl: knowledgeFacts.length,
      label: knowledgeFacts.length > 0 ? "Technische Daten" : "Handbuch",
      tone: "neutral",
    },
    ...(guideSichtbar
      ? [
          {
            key: "guide",
            href: `/machines/${machine.id}?bereich=guide`,
            zahl: guides.length > 0 ? "✓" : "–",
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
        <div className="flex items-start gap-4">
          {/* Foto als Teil der Identität mit in den Kopf (Klick öffnet es groß). */}
          {machine.fotoUrl ? (
            <a
              href={machine.fotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={machine.fotoUrl}
                alt={modellName(machine)}
                className="h-24 w-40 rounded-[var(--radius)] border border-[var(--color-border)] object-cover sm:h-36 sm:w-56"
              />
            </a>
          ) : null}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{modellName(machine)}</h1>
              {/* Der hervorgehobene Status ist ein Link auf sein „Fenster":
                  öffnet die Übersicht und scrollt zur Betriebsstatus-Steuerung. */}
              <Link
                href={`/machines/${machine.id}?bereich=uebersicht#status`}
                className="rounded-full transition-opacity hover:opacity-80"
                title="Betriebsstatus einsehen/ändern"
              >
                <StatusBadge value={machine.status} />
              </Link>
            </div>
            <p className="text-[var(--color-muted)]">
              {machine.baujahr ?? "Baujahr unbekannt"}
            </p>
            {/* Datenbank-Kennungen: Teil der Maschinen-Identität, darum im Kopf. */}
            {machine.opdbRef || machine.ipdbRef ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--color-muted)]">
                {machine.opdbRef ? (
                  <span>
                    <span className="text-[var(--color-faint)]">OPDB</span>{" "}
                    {machine.opdbRef}
                  </span>
                ) : null}
                {machine.ipdbRef ? (
                  <a
                    href={`https://www.ipdb.org/machine.cgi?id=${encodeURIComponent(machine.ipdbRef)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[var(--color-fg)] hover:underline"
                  >
                    <span className="text-[var(--color-faint)]">IPDB</span>{" "}
                    {machine.ipdbRef}
                    <ExternalLink size={12} />
                  </a>
                ) : null}
              </p>
            ) : null}
            {machine.club ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-[var(--color-muted)]">
                <Users size={14} /> {machine.club.name}
              </p>
            ) : null}
            {/* Tatsächliche Besitzer (rein informativ) + ggf. Club-Einladung. */}
            <BesitzerZeile machineId={machine.id} besitzer={besitzer} />
            {/* Ausstattung/Add-ons dieses Geräts — reine Anzeige; Pflege im
                Bearbeiten-Formular. */}
            <AusstattungListe ausstattung={ausstattung} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* QR-Etikett: führt zur öffentlichen Melde-Seite dieser Maschine —
              lesen/drucken darf jeder mit Zugriff. */}
          <Link
            href={`/machines/${machine.id}/qr`}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-border)]/40"
          >
            <QrCode size={15} /> QR-Code
          </Link>
          {/* Schreibende Bedienelemente nur, wenn der Nutzer auch schreiben darf. */}
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
              <ConfirmButton
                question="Diese Maschine samt Fehlern, Reparaturen und Wartungspunkten löschen?"
                confirmLabel="Ja, löschen"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/40 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                <Trash2 size={15} /> Löschen
              </ConfirmButton>
            </form>
          ) : null}
        </div>
      </div>

      {/* Reiterleiste (klebt unter dem Header). Der aktive Bereich steht in der URL. */}
      <MachineTabs primary={primary} secondary={secondary} />

      {/* ── Übersicht: Foto und Status-Dashboard ─────────────────────────────── */}
      {active === "uebersicht" ? (
        <div className="space-y-4">
          {/* Betriebsstatus an EINER Stelle: Status + „seit" + Grund + Steuerung
              in einer betitelten Karte. Ziel der Status-Links (Kopf-Badge,
              Dashboard) per #status — so landet der Sprung auf einem in sich
              geschlossenen Block, nicht auf losen Steuer-Elementen. */}
          <Card id="status" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Betriebsstatus</h3>
              <div className="flex items-center gap-2">
                <StatusBadge value={machine.status} />
                <StatusSeit seit={machine.statusSeit.toISOString()} />
              </div>
            </div>

            {/* WARUM ist die Maschine nicht spielbereit? Grund für ALLE sichtbar
                — manuell gepinnter Grund oder (automatisch) der kritische Fehler. */}
            {machine.status !== "spielbereit" ? (
              machine.statusManuell && machine.statusGrund ? (
                <p className="text-sm text-[var(--color-muted)]">
                  <span className="font-medium text-[var(--color-fg)]">
                    Grund:
                  </span>{" "}
                  {machine.statusGrund}
                </p>
              ) : !machine.statusManuell && fehler.anzahlKritischOffen > 0 ? (
                <p className="text-sm text-[var(--color-muted)]">
                  Automatisch eingeschränkt wegen{" "}
                  <Link
                    href={`/machines/${machine.id}?bereich=fehler`}
                    className="underline hover:text-[var(--color-fg)]"
                  >
                    offenem kritischen Fehler
                  </Link>
                  {fehler.anzahlKritischOffen > 1
                    ? ` (${fehler.anzahlKritischOffen})`
                    : ""}
                  .
                </p>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  Manuell gesetzt.
                </p>
              )
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Spielbereit — keine Einschränkung.
              </p>
            )}

            {darf.bearbeiten ? (
              <StatusSteuerung
                machineId={machine.id}
                status={machine.status}
                manuell={machine.statusManuell}
                grund={machine.statusGrund}
              />
            ) : null}
          </Card>
          <MachineOverview
            kpis={kpis}
            faultsPreview={
              <MachineFaultsPreview
                machineId={machine.id}
                faults={offeneFehler.slice(0, 5)}
              />
            }
          />
        </div>
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
            kiProviders={kiProviders}
            kiCentralKey={kiCentralKey}
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
                      clubs: meineClubs.map((c) => ({
                        id: c.id,
                        name: c.name,
                      })),
                      defaults: shareDefaults,
                      shares: Object.fromEntries(repairShares),
                    }
                  : undefined
              }
            />
          </div>

          {/* Reparaturdatenbank: von anderen Besitzern desselben Modells
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
          hatGuide={eigenerGuide}
          providers={kiProviders}
          centralKey={kiCentralKey}
          verknuepfterPlan={wartungsStandard}
          plans={wartung.plaene}
        />
      ) : null}

      {active === "termine" ? (
        <TerminListe
          termine={termine}
          machineId={machine.id}
          schreibbar={darf.bearbeiten}
        />
      ) : null}

      {active === "dokumente" ? (
        <DokumenteListe
          dokumente={dokumente}
          machineId={machine.id}
          schreibbar={darf.bearbeiten}
        />
      ) : null}

      {/* ── Handbuch-Daten (Phase 2) ─────────────────────────────────────────── */}
      {/* fullBleed: bricht aus der schmalen Spalte aus (bis ~1440px), damit die
          Switch-/Lamp-Matrizen genug Breite haben. */}
      {active === "handbuch" ? (
        <section className="mx-[calc(50%-50vw)] px-4 sm:px-6">
          <div className="mx-auto max-w-[1440px] space-y-3">
            {/* Instanz → Klasse: zum Modell mit allem geteilten Wissen. */}
            {machine.modelId ? (
              <Link
                href={`/modelle/${machine.modelId}`}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
              >
                <Boxes size={15} /> Modell: geteiltes Wissen zu{" "}
                {modellName(machine)}
              </Link>
            ) : null}
            {/* Handbuch-Fakten als Modell-Wissen (eigene + sichtbare fremde),
                je Eintrag mit Autor + Sichtbarkeit. */}
            <KnowledgeFacts
              eintraege={knowledgeFacts}
              currentUserId={currentUser.id}
              machineId={machine.id}
              kannKuratieren={kannKuratieren(currentUser)}
            />

            {/* Beide Wege sind KI-Extraktion aus dem Handbuch (App-intern ODER
                mit eigenem ChatGPT-/Claude-Abo) — ein Bereich, standardmäßig zu. */}
            {darf.bearbeiten ? (
              <CollapsibleSection title="Handbuch per KI auswerten">
                <ManualExtract
                  machineId={machine.id}
                  providers={kiProviders}
                  centralKey={kiCentralKey}
                />
              </CollapsibleSection>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── Troubleshooting-Guide (Phase 2: Modell-Wissen) ───────────────────── */}
      {active === "guide" && guideSichtbar ? (
        <div className="space-y-3">
          {guides.length > 0 ? (
            <KnowledgeGuides
              eintraege={guides}
              currentUserId={currentUser.id}
              machineId={machine.id}
              kannKuratieren={kannKuratieren(currentUser)}
            />
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Erzeuge aus Hersteller, Modell und Baujahr einen umfassenden FAQ-
              und Troubleshooting-Guide (Plattform-Erkennung, Fehlersuche nach
              Subsystemen, bekannte Serienfehler, Wartung). Claude prüft dabei
              Plattform und Serienprobleme per Websuche gegen Community-Quellen.
              {ollamaVerfuegbar
                ? " Das lokale Modell (Ollama) arbeitet ohne Websuche — der Guide wird dann entsprechend gekennzeichnet."
                : ""}{" "}
              Alternativ lässt sich ein fertiger Guide als JSON importieren
              (Prompt unten kopieren).
            </p>
          )}

          {darf.bearbeiten ? (
            <TroubleshootingGenerate
              machineId={machine.id}
              vorhanden={eigenerGuide}
              providers={kiProviders}
              centralKey={kiCentralKey}
              generation={guideGeneration}
            />
          ) : null}

          {/* Alternative ohne KI-Verarbeitung: fertiges Guide-JSON importieren
              (gleiches Prinzip wie beim Handbuch-Fakten-Import). */}
          {darf.bearbeiten ? (
            <Card className="space-y-3">
              <TroubleshootingJsonImport
                machineId={machine.id}
                prompt={guideImportPrompt ?? ""}
                vorhanden={eigenerGuide}
                generation={guideGeneration}
              />
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* ── Allgemeine Tipps (Modell-/Generations-Wissen, n:m) ───────────────── */}
      {active === "tipps" ? (
        <div className="space-y-3">
          {machine.modelId ? (
            <>
              <KnowledgeTipps
                eintraege={tipps}
                currentUserId={currentUser.id}
                machineId={machine.id}
                kannKuratieren={kannKuratieren(currentUser)}
              />
              {tippKatalog ? (
                <TippForm
                  machineId={machine.id}
                  modelle={tippKatalog.modelle}
                  generationen={tippKatalog.generationen}
                  vorauswahlModelId={machine.modelId}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Tipps gelten für Modelle oder ganze Generationen. Diese Maschine
              ist keinem Modell zugeordnet — wähle beim Bearbeiten eine
              OPDB-Referenz, dann erscheinen hier passende Tipps.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
