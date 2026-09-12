"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { RenameDialog } from "@/components/ui/rename-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ICON_BTN } from "@/components/ui/icon-button";
import { ListRow } from "@/components/ui/list";
import { deleteGeneration, renameGeneration } from "@/db/actions/generations";
import { anzahl } from "@/lib/format";

/*
  Eine Generation als kompakte Listenzeile: Name als Titel, darunter die
  Modellzahl als LINK auf die gefilterte Modell-Liste (/admin/modelle?gen=…) —
  statt einer Klappe mit den Modellen (P3). Rechts Stift (Dialog „Generation
  umbenennen") und Papierkorb (ConfirmButton, nennt die Folge für die Modelle).
*/
export function GenerationRow({
  id,
  name,
  modelle,
  zeitraum,
}: {
  id: string;
  name: string;
  /** Anzahl zugeordneter Modelle. */
  modelle: number;
  /** z. B. „1979–1984" — leer, wenn keine Jahre bekannt sind. */
  zeitraum: string | null;
}) {
  const [umbenennen, setUmbenennen] = useState(false);
  const loeschFrage =
    `„${name}" löschen?` +
    (modelle === 0
      ? ""
      : modelle === 1
        ? " 1 Modell verliert seine Zuordnung."
        : ` ${modelle} Modelle verlieren ihre Zuordnung.`);

  return (
    <ListRow
      title={name}
      subtitle={
        <>
          <Link href={`/admin/modelle?gen=${id}`} className="hover:underline">
            {anzahl(modelle, "Modell", "Modelle")}
          </Link>
          {zeitraum ? <> · {zeitraum}</> : null}
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setUmbenennen(true)}
            aria-label={`${name} umbenennen`}
            title="Umbenennen"
            className={ICON_BTN}
          >
            <Pencil size={14} />
          </button>
          <ActionForm action={deleteGeneration} className="flex items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <ConfirmButton
              question={loeschFrage}
              confirmLabel="Ja, löschen"
              aria-label={`${name} löschen`}
              title="Löschen"
              className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
            >
              <Trash2 size={14} />
            </ConfirmButton>
          </ActionForm>
          {umbenennen ? (
            <RenameDialog
              action={renameGeneration}
              titel="Generation umbenennen"
              feldName="id"
              feldWert={id}
              name={name}
              onClose={() => setUmbenennen(false)}
            />
          ) : null}
        </>
      }
    />
  );
}
