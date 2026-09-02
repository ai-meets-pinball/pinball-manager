"use client";

import { useActionState, useState } from "react";
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
  Punkte werden eigene, frei editierbare Tasks; kein Link). Beide Actions geben
  FormState zurück und hängen je an einem useActionState — der zweite Weg über
  `formAction` am Button, damit eine Ablehnung (kein Zugriff) sichtbar wird
  statt still nichts zu tun.
*/
type Plan = { id: string; name: string; gruppe: string };

export function LinkStandardForm({
  machineId,
  plans,
}: {
  machineId: string;
  plans: Plan[];
}) {
  const [verknuepfen, verknuepfenAction, verknuepft] = useActionState<
    FormState,
    FormData
  >(linkMachineToStandard, {});
  const [kopie, kopieAction, kopiert] = useActionState<FormState, FormData>(
    applyStandardMaintenance,
    {},
  );
  const pending = verknuepft || kopiert;
  // Welche Action zuletzt lief — nur deren Rückmeldung wird gezeigt (sonst
  // deckte ein altes „Kopie"-Ergebnis einen neuen Verknüpfen-Fehler zu).
  const [zuletzt, setZuletzt] = useState<"verknuepfen" | "kopie">("verknuepfen");

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
    <form action={verknuepfenAction} className="flex flex-wrap items-center gap-2">
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
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => setZuletzt("verknuepfen")}
      >
        <Link2 size={14} /> {verknuepft ? "Verknüpfe…" : "Verknüpfen"}
      </Button>
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        formAction={kopieAction}
        disabled={pending}
        onClick={() => setZuletzt("kopie")}
      >
        <Copy size={14} /> {kopiert ? "Kopiere…" : "Als Kopie übernehmen"}
      </Button>
      <FormFeedback state={zuletzt === "kopie" ? kopie : verknuepfen} />
    </form>
  );
}
