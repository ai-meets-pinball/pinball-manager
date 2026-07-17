"use client";

import { LogOut, UserMinus } from "lucide-react";
import { useActionState } from "react";
import { Select } from "@/components/ui/input";
import { ROLE_LABEL, StatusBadge } from "@/components/ui/status-badge";
import {
  changeMemberRole,
  leaveClub,
  removeMember,
  type FormState,
} from "@/db/actions/clubs";
import { CLUB_ROLES, type ClubRole } from "@/lib/validators";

/*
  Rollen- und Mitgliedschaftssteuerung je Mitglied. Bewusst explizit:
  - Manager (Owner/Admin) sehen eine Rollen-Auswahl + Entfernen.
  - Die Owner-Rolle ist nur wählbar/entfernbar, wenn der Betrachter Owner ist.
  - Der eigene Eintrag zeigt „Club verlassen" (die Owner-Invariante prüft die Action).
*/
export function MemberActions({
  clubId,
  memberId,
  rolle,
  isSelf,
  canManage,
  canManageOwner,
}: {
  clubId: string;
  memberId: string;
  rolle: ClubRole;
  isSelf: boolean;
  canManage: boolean;
  canManageOwner: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    changeMemberRole,
    {},
  );

  // Owner darf nur ein Owner (oder Super-Admin) anfassen.
  const editable = canManage && !isSelf && (rolle !== "owner" || canManageOwner);
  const roleOptions: ClubRole[] = canManageOwner
    ? [...CLUB_ROLES]
    : CLUB_ROLES.filter((r) => r !== "owner");

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {editable ? (
          <form action={action} className="flex items-center gap-1">
            <input type="hidden" name="clubId" value={clubId} />
            <input type="hidden" name="userId" value={memberId} />
            <Select
              name="rolle"
              defaultValue={rolle}
              className="w-auto py-1 text-xs"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
            <button
              type="submit"
              disabled={pending}
              className="rounded-[var(--radius)] border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-border)]/40 disabled:opacity-50"
            >
              {pending ? "…" : "Speichern"}
            </button>
          </form>
        ) : (
          <StatusBadge value={rolle} />
        )}

        {editable ? (
          <form action={removeMember}>
            <input type="hidden" name="clubId" value={clubId} />
            <input type="hidden" name="userId" value={memberId} />
            <button
              type="submit"
              aria-label="Mitglied entfernen"
              className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
            >
              <UserMinus size={16} />
            </button>
          </form>
        ) : null}

        {isSelf ? (
          <form action={leaveClub}>
            <input type="hidden" name="clubId" value={clubId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
            >
              <LogOut size={14} /> Verlassen
            </button>
          </form>
        ) : null}
      </div>
      {state.error ? (
        <p className="text-xs text-[var(--color-danger)]">{state.error}</p>
      ) : null}
    </div>
  );
}
