import Link from "next/link";
import { Link2Off, ListChecks, Plus } from "lucide-react";
import { LinkStandardForm } from "@/components/link-standard-form";
import { MaintenanceGuideImport } from "@/components/maintenance-guide-import";
import { MaintenanceTasks, type Task } from "@/components/maintenance-tasks";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import type { AiProvider } from "@/lib/ai/provider";
import { unlinkMachineFromStandard } from "@/db/actions/maintenance-plans";

/*
  Interaktiver Wartungsplan je Gerät: Verknüpfung mit einem Standard-Plan bzw.
  eigene Punkte + Guide-Import. Die eigentliche Wartungspunkt-Liste (Fälligkeit,
  Erledigt-Eintrag, Historie, Sammel-Erledigen — und der Leerfall) rendert
  MaintenanceTasks.
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
            <ActionForm action={unlinkMachineFromStandard} className="ml-auto">
              <input type="hidden" name="machineId" value={machineId} />
              <ConfirmButton
                question="Verknüpfung lösen? Alle Punkte werden eigene, frei editierbare Kopien."
                confirmLabel="Ja, lösen"
              >
                <Link2Off size={13} /> Verknüpfung lösen
              </ConfirmButton>
            </ActionForm>
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

          <ButtonLink
            variant="secondary"
            size="sm"
            href={`/machines/${machineId}/maintenance/new`}
          >
            <Plus size={14} /> Neuer Wartungspunkt
          </ButtonLink>
        </div>
      ) : null}

      <MaintenanceTasks
        tasks={tasks}
        machineId={machineId}
        schreibbar={schreibbar}
      />
    </div>
  );
}
