"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { FormFeedback } from "@/components/ui/form-feedback";
import {
  setzeMaschinenStatus,
  statusAufAutomatik,
} from "@/db/actions/machine-status";
import { BETRIEBSSTATUS, STATUS_LABEL } from "@/lib/betriebsstatus";
import type { FormState } from "@/db/actions/form-state";

/*
  Betriebsstatus von Hand setzen (nur mit Schreibrecht). Aufklappbar, damit die
  Übersicht ruhig bleibt. Ist der Status bereits manuell gepinnt, gibt es
  zusätzlich „Zurück auf Automatik" — dann folgt er wieder den offenen Fehlern.
*/
export function StatusSteuerung({
  machineId,
  status,
  manuell,
}: {
  machineId: string;
  status: string;
  manuell: boolean;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await setzeMaschinenStatus(prev, fd);
      if (res.message) {
        setOffen(false);
        router.refresh();
      }
      return res;
    },
    {},
  );

  if (!offen) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOffen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <SlidersHorizontal size={13} /> Status manuell setzen
        </button>
        {manuell ? (
          <form
            action={async (fd: FormData) => {
              await statusAufAutomatik({}, fd);
              router.refresh();
            }}
          >
            <input type="hidden" name="machineId" value={machineId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <RotateCcw size={13} /> Zurück auf Automatik
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="machineId" value={machineId} />
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <Field label="Status">
          <Select name="status" defaultValue={status}>
            {BETRIEBSSTATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Begründung (optional)">
          <Input name="grund" placeholder="z. B. Netzteil defekt, Teil bestellt" />
        </Field>
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        Manuell gesetzter Status bleibt fest, bis du „Zurück auf Automatik"
        wählst — die Fehler-Automatik übersteuert ihn dann nicht mehr.
      </p>
      <FormFeedback state={state} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Status setzen"}
        </Button>
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
