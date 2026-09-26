"use client";

import { useActionState } from "react";
import { BadgeCheck, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteBesitzer } from "@/db/actions/besitzer";
import type { FormState } from "@/db/actions/form-state";

/*
  Besitzer-Zeile im Kopf der Maschinen-Detailseite: zeigt die TATSÄCHLICHEN
  Besitzer (Katalog-Einträge, rein informativ — nicht die Autorisierung). Ein
  Gerät kann mehrere Besitzer haben. Hat ein Eintrag eine E-Mail, aber noch
  kein Konto, können Club-Owner/-Admins ihn direkt von hier in den Club
  einladen (bestehender Einladungsfluss).
*/
type Besitzer = {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
  einladbar: boolean;
};

export function BesitzerZeile({
  machineId,
  besitzer,
}: {
  machineId: string;
  besitzer: Besitzer[];
}) {
  if (besitzer.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
      <span className="inline-flex items-center gap-1">
        <UserRound size={14} /> Besitzer:
      </span>
      {besitzer.map((b) => (
        <EinBesitzer key={b.id} machineId={machineId} besitzer={b} />
      ))}
    </div>
  );
}

function EinBesitzer({
  machineId,
  besitzer,
}: {
  machineId: string;
  besitzer: Besitzer;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    inviteBesitzer,
    {},
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      {besitzer.name}
      {besitzer.userId ? (
        <span
          title="auf der Plattform"
          aria-label="auf der Plattform"
          className="inline-flex items-center text-[var(--color-success)]"
        >
          <BadgeCheck size={14} />
        </span>
      ) : besitzer.einladbar ? (
        <form action={formAction} className="inline-flex items-center gap-2">
          <input type="hidden" name="machineId" value={machineId} />
          <input type="hidden" name="besitzerId" value={besitzer.id} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="rounded-full px-2 py-0.5 text-xs font-normal"
          >
            <Mail size={12} /> In den Club einladen
          </Button>
        </form>
      ) : null}
      {state.message ? (
        <span className="text-xs text-[var(--color-success)]">
          {state.message}
        </span>
      ) : null}
      {state.error ? (
        <span className="text-xs text-[var(--color-danger)]">
          {state.error}
        </span>
      ) : null}
    </span>
  );
}
