"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { RenameDialog } from "@/components/ui/rename-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { deletePlan, renamePlan } from "@/db/actions/maintenance-plans";

/*
  Kopf eines Plans (nur für Manager): Name als Titel, daneben Stift (Umbenennen
  im Dialog) und Papierkorb (ConfirmButton) als Icon-Aktionen; rechts der Slot
  für „Punkt hinzufügen" (kommt von der Seite). Vorher tauschte der Stift den
  Titel gegen ein Inline-Eingabefeld — das dritte Bearbeiten-Muster auf einer
  Seite. Löschen entkoppelt verknüpfte Maschinen (ihre Punkte werden eigene
  Kopien).
*/
export function PlanHeader({
  planId,
  name,
  children,
}: {
  planId: string;
  name: string;
  /** Aktionen rechts (z. B. „Punkt hinzufügen"). */
  children?: ReactNode;
}) {
  const [umbenennen, setUmbenennen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-lg font-semibold">{name}</h2>
      <button
        type="button"
        onClick={() => setUmbenennen(true)}
        aria-label="Plan umbenennen"
        title="Umbenennen"
        className={ICON_BTN}
      >
        <Pencil size={14} />
      </button>
      <ActionForm action={deletePlan}>
        <input type="hidden" name="planId" value={planId} />
        <ConfirmButton
          question="Plan löschen? Verknüpfte Maschinen werden entkoppelt — ihre Punkte werden eigene, editierbare Kopien; die Historie bleibt."
          confirmLabel="Ja, löschen"
          aria-label="Plan löschen"
          title="Plan löschen"
          className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
        >
          <Trash2 size={14} />
        </ConfirmButton>
      </ActionForm>
      {children ? (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      ) : null}
      {umbenennen ? (
        <RenameDialog
          action={renamePlan}
          titel="Plan umbenennen"
          feldName="planId"
          feldWert={planId}
          name={name}
          maxLength={80}
          onClose={() => setUmbenennen(false)}
        />
      ) : null}
    </div>
  );
}
