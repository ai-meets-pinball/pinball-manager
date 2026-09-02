"use client";

import { LogOut, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { ICON_BTN } from "@/components/ui/icon-button";
import { Field, Select } from "@/components/ui/input";
import { ROLE_LABEL } from "@/components/ui/status-badge";
import { changeMemberRole, leaveClub, removeMember } from "@/db/actions/clubs";
import type { FormState } from "@/db/actions/form-state";
import { rolleEntfernenGesperrt } from "@/lib/rechte";
import { CLUB_ROLES, type ClubRole } from "@/lib/validators";

/*
  Zeilen-Aktionen je Mitglied — dasselbe Muster wie die Rollen im Admin
  (admin-user-roles.tsx): rechts kleine Icons, die Rolle steht als Badge in der
  Zeile (setzt die Seite). Stift öffnet den Rollen-Dialog, Papierkorb entfernt,
  am eigenen Eintrag steht stattdessen „Verlassen".
  - Owner darf nur anfassen, wer selbst Owner (oder Super-Admin) ist.
  - Letzter Owner: weder herabstufen noch entfernen noch austreten — dieselbe
    Regel, mit der die Actions ablehnen (rolleEntfernenGesperrt); hier graut sie
    die Icons aus und sagt im Tooltip warum.
*/
export function MemberActions({
  clubId,
  memberId,
  name,
  rolle,
  isSelf,
  canManage,
  canManageOwner,
  ownerAnzahl,
}: {
  clubId: string;
  memberId: string;
  name: string;
  rolle: ClubRole;
  isSelf: boolean;
  canManage: boolean;
  canManageOwner: boolean;
  /** Owner im Club — für die „mind. 1 Owner"-Sperre (lib/rechte.ts). */
  ownerAnzahl: number;
}) {
  const [dialog, setDialog] = useState(false);

  const editable =
    canManage && !isSelf && (rolle !== "owner" || canManageOwner);
  const roleOptions: ClubRole[] = canManageOwner
    ? [...CLUB_ROLES]
    : CLUB_ROLES.filter((r) => r !== "owner");
  const sperre = rolleEntfernenGesperrt({ scope: "club", rolle, ownerAnzahl });

  return (
    <span className="flex items-center gap-1">
      {sperre ? (
        <span className="hidden text-xs text-[var(--color-faint)] sm:inline">
          letzter Owner
        </span>
      ) : null}

      {editable ? (
        <>
          {/* Beim letzten Owner gesperrt: das einzige erlaubte Ziel wäre
              wieder Owner. */}
          <button
            type="button"
            onClick={() => setDialog(true)}
            disabled={sperre !== null}
            aria-label={`Rolle von ${name} ändern`}
            title={sperre ?? "Rolle ändern"}
            className={ICON_BTN}
          >
            <Pencil size={14} />
          </button>
          <ActionForm action={removeMember}>
            <input type="hidden" name="clubId" value={clubId} />
            <input type="hidden" name="userId" value={memberId} />
            <ConfirmButton
              question={`${name} aus dem Club entfernen? Die Person verliert den Zugriff auf die Club-Maschinen.`}
              confirmLabel="Ja, entfernen"
              disabled={sperre !== null}
              aria-label={`${name} aus dem Club entfernen`}
              title={sperre ?? "Mitglied entfernen"}
              className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
            >
              <Trash2 size={14} />
            </ConfirmButton>
          </ActionForm>
        </>
      ) : null}

      {isSelf ? (
        <ActionForm action={leaveClub}>
          <input type="hidden" name="clubId" value={clubId} />
          <ConfirmButton
            question="Diesen Club verlassen? Du verlierst den Zugriff auf die Club-Maschinen."
            confirmLabel="Ja, verlassen"
            disabled={sperre !== null}
            aria-label="Club verlassen"
            title={sperre ?? "Club verlassen"}
            className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
          >
            <LogOut size={14} />
          </ConfirmButton>
        </ActionForm>
      ) : null}

      {dialog ? (
        <RollenDialog
          clubId={clubId}
          memberId={memberId}
          name={name}
          rolle={rolle}
          roleOptions={roleOptions}
          onClose={() => setDialog(false)}
        />
      ) : null}
    </span>
  );
}

/* Nur gemountet, solange offen (siehe ActionDialog): jede Öffnung startet mit
   frischem Zustand; Erfolg (state.ok) schließt. */
function RollenDialog({
  clubId,
  memberId,
  name,
  rolle,
  roleOptions,
  onClose,
}: {
  clubId: string;
  memberId: string;
  name: string;
  rolle: ClubRole;
  roleOptions: ClubRole[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    changeMemberRole,
    {},
  );
  const [neu, setNeu] = useState<ClubRole>(rolle);

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={action} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">Rolle ändern</h3>
        <p className="text-sm">
          <span className="text-[var(--color-muted)]">Mitglied:</span> {name}
        </p>

        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="userId" value={memberId} />

        <Field label="Rolle">
          <Select
            name="rolle"
            value={neu}
            onChange={(e) => setNeu(e.target.value as ClubRole)}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </Select>
        </Field>

        <FormFeedback state={state} />

        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || neu === rolle}>
            {pending ? "…" : "Speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
