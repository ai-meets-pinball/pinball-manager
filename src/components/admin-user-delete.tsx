"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { ICON_BTN } from "@/components/ui/icon-button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteUserByAdmin } from "@/db/actions/admin";
import type { FormState } from "@/db/actions/form-state";

/*
  Papierkorb am Nutzer (Admin): löscht das Konto — über das ConfirmButton-Modal,
  mit der Folge im Klartext. Das eigene Konto ist hier gesperrt (Tooltip sagt
  wohin); eine Ablehnung des Servers (alleiniger Owner) steht rot neben dem Icon.
*/
export function NutzerLoeschen({
  userId,
  name,
  istSelbst,
}: {
  userId: string;
  name: string;
  istSelbst: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    deleteUserByAdmin,
    {},
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      {state.error ? (
        <span className="max-w-xs text-xs text-[var(--color-danger)]">
          {state.error}
        </span>
      ) : null}
      <ConfirmButton
        question={`Konto von ${name} unwiderruflich löschen? Private Maschinen samt Fotos werden gelöscht; in Clubs geteilte Inhalte bleiben erhalten.`}
        confirmLabel="Ja, Konto löschen"
        disabled={istSelbst}
        aria-label={`Konto von ${name} löschen`}
        title={istSelbst ? "Das eigene Konto löschst du unter „Konto“" : "Konto löschen"}
        className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
      >
        <Trash2 size={14} />
      </ConfirmButton>
    </form>
  );
}
