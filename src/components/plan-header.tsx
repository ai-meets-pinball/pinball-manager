"use client";

import { useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deletePlan, renamePlan } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/form-state";

/*
  Kopf eines Plans (nur für Manager): Umbenennen + Löschen. Löschen entkoppelt
  verknüpfte Maschinen (ihre Punkte werden eigene Kopien; Historie bleibt).
*/
export function PlanHeader({
  planId,
  name,
}: {
  planId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    renamePlan,
    {},
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="planId" value={planId} />
        <Input
          name="name"
          defaultValue={name}
          aria-label="Plan-Name"
          maxLength={80}
          className="max-w-56"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          <Pencil size={13} /> Umbenennen
        </Button>
      </form>
      <form action={deletePlan} className="ml-auto">
        <input type="hidden" name="planId" value={planId} />
        <ConfirmButton
          question="Plan löschen? Verknüpfte Maschinen werden entkoppelt — ihre Punkte werden eigene, editierbare Kopien; die Historie bleibt."
          confirmLabel="Ja, löschen"
        >
          <Trash2 size={13} /> Plan löschen
        </ConfirmButton>
      </form>
      {state.error ? (
        <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
      ) : null}
    </div>
  );
}
