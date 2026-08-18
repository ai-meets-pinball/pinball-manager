"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Select } from "@/components/ui/input";
import { ROLE_LABEL } from "@/components/ui/status-badge";
import { removeClubRoleForUser, setClubRoleForUser } from "@/db/actions/admin";
import type { FormState } from "@/db/actions/form-state";
import { CLUB_ROLES } from "@/lib/validators";

/*
  Club-Rollen eines Nutzers im Admin verwalten (nur Super-Admin, Guard in der
  Action). Spiegelt member-actions.tsx, nur zentral: bestehende Rollen ändern/
  entfernen + eine neue Club-Rolle zuweisen. Eine Club-Rolle braucht IMMER einen
  Club — darum das Pflicht-Auswahlfeld beim Hinzufügen.
*/
const BTN =
  "rounded-[var(--radius)] border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-border)]/40 disabled:opacity-50";

type ClubRolle = { clubId: string; clubName: string; rolle: string };
type ClubBasic = { id: string; name: string };

export function AdminClubRoles({
  userId,
  clubRoles,
  allClubs,
}: {
  userId: string;
  clubRoles: ClubRolle[];
  allClubs: ClubBasic[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    setClubRoleForUser,
    {},
  );
  const belegt = new Set(clubRoles.map((c) => c.clubId));
  const frei = allClubs.filter((c) => !belegt.has(c.id));

  return (
    <div className="space-y-2">
      {clubRoles.length === 0 ? (
        <p className="text-xs text-[var(--color-faint)]">Keine Club-Rolle.</p>
      ) : (
        <ul className="space-y-1.5">
          {clubRoles.map((c) => (
            <li key={c.clubId} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[8rem] text-sm">{c.clubName}</span>
              <form action={action} className="flex items-center gap-1">
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="clubId" value={c.clubId} />
                <Select
                  name="rolle"
                  defaultValue={c.rolle}
                  className="w-auto py-1 text-xs"
                >
                  {CLUB_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <button type="submit" disabled={pending} className={BTN}>
                  {pending ? "…" : "Speichern"}
                </button>
              </form>
              <form action={removeClubRoleForUser}>
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="clubId" value={c.clubId} />
                <ConfirmButton
                  question={`Club-Rolle in ${c.clubName} entfernen?`}
                  confirmLabel="Ja, entfernen"
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                >
                  Entfernen
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      {frei.length > 0 ? (
        <form
          action={action}
          className="flex flex-wrap items-center gap-1 border-t border-[var(--color-border)] pt-2"
        >
          <input type="hidden" name="userId" value={userId} />
          <Select
            name="clubId"
            defaultValue=""
            required
            className="w-auto py-1 text-xs"
          >
            <option value="" disabled>
              Club wählen …
            </option>
            {frei.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select name="rolle" defaultValue="member" className="w-auto py-1 text-xs">
            {CLUB_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
          <button type="submit" disabled={pending} className={BTN}>
            Zuweisen
          </button>
        </form>
      ) : null}

      {state.error ? (
        <p className="text-xs text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="text-xs text-[var(--color-success)]">{state.message}</p>
      ) : null}
    </div>
  );
}
