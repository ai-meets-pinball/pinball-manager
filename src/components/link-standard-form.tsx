"use client";

import { useActionState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/input";
import { applyStandardMaintenance } from "@/db/actions/maintenance";
import { linkMachineToStandard } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/form-state";

/*
  Maschine mit einem konkreten Standard-Plan verbinden — aus MEHREREN wählbaren
  Plänen (eigene + Club-Pläne, gruppiert). Zwei Wege mit demselben gewählten
  Plan: „Verknüpfen" (folgt dem Standard, Propagation) oder „Als Kopie" (die
  Punkte werden eigene, frei editierbare Tasks; kein Link).
*/
type Plan = { id: string; name: string; gruppe: string };

export function LinkStandardForm({
  machineId,
  plans,
}: {
  machineId: string;
  plans: Plan[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    linkMachineToStandard,
    {},
  );

  if (plans.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Noch kein Wartungsplan vorhanden —{" "}
        <a
          href="/wartungsplaene"
          className="text-[var(--color-primary)] hover:underline"
        >
          einen anlegen
        </a>
        .
      </p>
    );
  }

  const gruppen = [...new Set(plans.map((p) => p.gruppe))];

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="machineId" value={machineId} />
      <Select
        name="planId"
        aria-label="Wartungsplan wählen"
        defaultValue={plans[0].id}
        className="max-w-56"
      >
        {gruppen.map((g) => (
          <optgroup key={g} label={g}>
            {plans
              .filter((p) => p.gruppe === g)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        <Link2 size={14} /> {pending ? "Verknüpfe…" : "Verknüpfen"}
      </Button>
      {/* Zweiter Weg mit demselben gewählten Plan: als eigene Kopie übernehmen. */}
      <button
        type="submit"
        formAction={applyStandardMaintenance}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
      >
        <Copy size={14} /> Als Kopie übernehmen
      </button>
      <FormFeedback state={state} />
    </form>
  );
}
