"use client";

import { useActionState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/input";
import { linkMachineToStandard } from "@/db/actions/maintenance-plans";
import type { FormState } from "@/db/actions/clubs";

/*
  Maschine mit einem Standard-Wartungsplan verknüpfen: „Mein Standard" oder ein
  Club-Standard. Danach folgt die Maschine dem Standard (Änderungen propagieren);
  bestehende Punkte mit gleichem Titel behalten ihre Historie.
*/
export function LinkStandardForm({
  machineId,
  clubs,
}: {
  machineId: string;
  clubs: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    linkMachineToStandard,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="machineId" value={machineId} />
      <Select
        name="ziel"
        defaultValue="user"
        aria-label="Standard wählen"
        className="max-w-56"
      >
        <option value="user">Mein Standard</option>
        {clubs.map((c) => (
          <option key={c.id} value={c.id}>
            Standard {c.name}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        <Link2 size={14} /> {pending ? "Verknüpfe…" : "Mit Standard verknüpfen"}
      </Button>
      <FormFeedback state={state} />
    </form>
  );
}
