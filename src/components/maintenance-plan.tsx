import Link from "next/link";
import { Link2Off, ListChecks, Plus } from "lucide-react";
import { LinkStandardForm } from "@/components/link-standard-form";
import { MaintenanceGuideImport } from "@/components/maintenance-guide-import";
import { MaintenanceTasks, type Task } from "@/components/maintenance-tasks";
import { ConfirmButton } from "@/components/ui/confirm-button";
import type { AiProvider } from "@/lib/ai/provider";
import { unlinkMachineFromStandard } from "@/db/actions/maintenance-plans";

/*
  Interaktiver Wartungsplan je Gerät: Verknüpfung mit einem Standard-Plan bzw.
  eigene Punkte + Guide-Import. Die eigentliche Wartungspunkt-Liste (Fälligkeit,
  Erledigt-Eintrag, Historie und Sammel-Erledigen) rendert MaintenanceTasks.
*/
export function MaintenancePlan({
  tasks,
  machineId,
  schreibbar,
  hatGuide,
  providers,
  centralKey,
  verknuepfterPlan,
  plans,
}: {
  tasks: Task[];
  machineId: string;
  schreibbar: boolean;
  hatGuide: boolean;
  /** Verfügbare KI-Anbieter für „Aus Guide übernehmen" (Auswahl, wenn mehrere). */
  providers: AiProvider[];
  /** Zentraler Anthropic-Key vorhanden? Sonst BYO-Feld beim Claude-Weg. */
  centralKey: boolean;
  /** Verknüpfter Standard (oder null = eigener Plan / Kopie). */
  verknuepfterPlan: { name: string } | null;
  /** Verknüpfbare Standard-Pläne (eigene + Club-Pläne), fürs Picker-Dropdown. */
  plans: { id: string; name: string; gruppe: string }[];
}) {
  return (
    <div className="space-y-3">
      {schreibbar ? (
        verknuepfterPlan ? (
          /* Verknüpft: der Standard verwaltet die Punkte — hier nur lösen,
             Standard bearbeiten oder ZUSÄTZLICHE eigene Punkte anlegen. */
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks size={15} className="text-[var(--color-primary)]" />
              Verknüpft mit <strong>„{verknuepfterPlan.name}“</strong> —
              Änderungen am Standard wirken hier.
            </span>
            <Link
              href="/wartungsplaene"
              className="text-[var(--color-primary)] hover:underline"
            >
              Standard bearbeiten
            </Link>
            <form action={unlinkMachineFromStandard} className="ml-auto">
              <input type="hidden" name="machineId" value={machineId} />
              <ConfirmButton
                question="Verknüpfung lösen? Alle Punkte werden eigene, frei editierbare Kopien."
                confirmLabel="Ja, lösen"
              >
                <Link2Off size={13} /> Verknüpfung lösen
              </ConfirmButton>
            </form>
          </div>
        ) : (
          <LinkStandardForm machineId={machineId} plans={plans} />
        )
      ) : null}

      {schreibbar ? (
        <div className="flex flex-wrap items-start gap-3">
          {hatGuide ? (
            <MaintenanceGuideImport
              machineId={machineId}
              providers={providers}
              centralKey={centralKey}
            />
          ) : null}

          <Link
            href={`/machines/${machineId}/maintenance/new`}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
          >
            <Plus size={15} /> Neuer Wartungspunkt
          </Link>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Noch keine Wartungspunkte.{" "}
          {schreibbar
            ? "Übernimm den Standard-Wartungsplan, importiere aus dem Guide oder lege eigene Punkte an."
            : ""}
        </p>
      ) : (
        <MaintenanceTasks
          tasks={tasks}
          machineId={machineId}
          schreibbar={schreibbar}
        />
      )}
    </div>
  );
}
