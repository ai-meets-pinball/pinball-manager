"use client";

import { ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Select } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list";
import { ROLE_LABEL, StatusBadge } from "@/components/ui/status-badge";
import { removeUserRole, setUserRole } from "@/db/actions/admin";
import type { FormState } from "@/db/actions/form-state";
import { rolleEntfernenGesperrt } from "@/lib/rechte";
import { CLUB_ROLES, KURATOR_ROLE, SUPERADMIN_ROLE } from "@/lib/validators";
import { ICON_BTN } from "@/components/ui/icon-button";

/*
  Rollen eines Nutzers im Admin (nur Super-Admin, Guard in den Actions).

  EIN Muster für beide Achsen: jede Zuweisung ist eine Zeile „Wo · Rolle" mit
  Stift (nur Club-Rollen — globale haben keine Stufen) und Papierkorb rechts.
  Hinzufügen und Ändern laufen über EINEN Dialog (natives <dialog>, wie
  ConfirmButton): „Wo?" bestimmt, welche Rollen zur Wahl stehen, damit sich
  Owner für „Plattform" oder Kurator für einen Club gar nicht wählen lassen.

  Was nicht geht, ist deaktiviert und sagt warum (rolleEntfernenGesperrt) —
  statt erst der Server-Fehlerseite. Die Actions prüfen dieselbe Regel.

  Zwei Inseln, ein Dialog: AdminUserRoles (Zeilen + Ändern) sitzt im Karten-
  Körper, RolleHinzufuegen (Button + Neu-Dialog) im Kartenkopf — so kostet das
  Hinzufügen keine eigene Zeile. Die Listenansicht (NutzerZeile) zeigt die Rollen
  als stille Chips; der Stift klappt denselben Editor unter der Zeile auf.
*/

/** Vergebbare globale Rollen — spiegelt VERGEBBARE_GLOBALE_ROLLEN in actions/admin.ts. */
const GLOBALE_ROLLEN = [SUPERADMIN_ROLE, KURATOR_ROLE];

type ClubRolle = { clubId: string; clubName: string; rolle: string };
type ClubBasic = { id: string; name: string };

type Dialog =
  | { art: "neu" }
  | { art: "aendern"; clubId: string; clubName: string; rolle: string };

/* Welche Zuweisungen sind noch frei? Für den Neu-Dialog (und ob der Button
   überhaupt etwas anzubieten hat). Eigene globale Rollen bleiben tabu. */
function freieZuweisungen({
  istSelbst,
  globalRoles,
  clubRoles,
  allClubs,
}: {
  istSelbst: boolean;
  globalRoles: string[];
  clubRoles: ClubRolle[];
  allClubs: ClubBasic[];
}) {
  const belegt = new Set(clubRoles.map((c) => c.clubId));
  return {
    freieClubs: allClubs.filter((c) => !belegt.has(c.id)),
    freieGlobale: istSelbst
      ? []
      : GLOBALE_ROLLEN.filter((r) => !globalRoles.includes(r)),
  };
}

type RollenProps = {
  userId: string;
  /** Ist das der angemeldete Super-Admin selbst? */
  istSelbst: boolean;
  globalRoles: string[];
  clubRoles: ClubRolle[];
  allClubs: ClubBasic[];
  /** Owner je Club (clubId → Anzahl) — für die „mind. 1 Owner"-Sperre. */
  ownerAnzahl: Record<string, number>;
  superAdminAnzahl: number;
};

/** Kopf-Button „Rolle hinzufügen" mit dem Neu-Dialog. */
export function RolleHinzufuegen(props: {
  userId: string;
  istSelbst: boolean;
  globalRoles: string[];
  clubRoles: ClubRolle[];
  allClubs: ClubBasic[];
}) {
  const [offen, setOffen] = useState(false);
  const { freieClubs, freieGlobale } = freieZuweisungen(props);
  const nichtsFrei = freieClubs.length === 0 && freieGlobale.length === 0;
  return (
    <>
      <button
        type="button"
        disabled={nichtsFrei}
        title={nichtsFrei ? "Alle möglichen Rollen sind bereits vergeben" : undefined}
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} /> Rolle hinzufügen
      </button>
      {offen ? (
        <RollenDialog
          userId={props.userId}
          dialog={{ art: "neu" }}
          freieClubs={freieClubs}
          freieGlobale={freieGlobale}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </>
  );
}

export function AdminUserRoles({
  userId,
  istSelbst,
  globalRoles,
  clubRoles,
  allClubs,
  ownerAnzahl,
  superAdminAnzahl,
}: RollenProps) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [entfernen, entfernenAction] = useActionState<FormState, FormData>(
    removeUserRole,
    {},
  );
  const { freieClubs, freieGlobale } = freieZuweisungen({
    istSelbst,
    globalRoles,
    clubRoles,
    allClubs,
  });

  const zeilen = [
    ...globalRoles.map((rolle) => ({
      key: `global:${rolle}`,
      scope: "global" as const,
      clubId: "",
      ort: "Plattform",
      rolle,
      sperre: rolleEntfernenGesperrt({
        scope: "global",
        rolle,
        superAdminAnzahl,
        istSelbst,
      }),
    })),
    ...clubRoles.map((c) => ({
      key: `club:${c.clubId}`,
      scope: "club" as const,
      clubId: c.clubId,
      ort: c.clubName,
      rolle: c.rolle,
      sperre: rolleEntfernenGesperrt({
        scope: "club",
        rolle: c.rolle,
        ownerAnzahl: ownerAnzahl[c.clubId] ?? 0,
      }),
    })),
  ];

  type Zeile = (typeof zeilen)[number];

  /* Stift (nur Club) + Papierkorb je Zeile. */
  const aktionen = (z: Zeile) => (
    <span className="flex flex-none items-center">
      {z.scope === "club" ? (
        <button
          type="button"
          onClick={() =>
            setDialog({
              art: "aendern",
              clubId: z.clubId,
              clubName: z.ort,
              rolle: z.rolle,
            })
          }
          aria-label={`Rolle in ${z.ort} ändern`}
          title="Rolle ändern"
          className={ICON_BTN}
        >
          <Pencil size={14} />
        </button>
      ) : null}
      <form action={entfernenAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="scope" value={z.scope} />
        <input type="hidden" name="clubId" value={z.clubId} />
        <input type="hidden" name="rolle" value={z.rolle} />
        <ConfirmButton
          question={`Rolle „${ROLE_LABEL[z.rolle] ?? z.rolle}" in ${z.ort} entfernen?`}
          confirmLabel="Ja, entfernen"
          disabled={z.sperre !== null}
          aria-label={`Rolle in ${z.ort} entfernen`}
          title={z.sperre ?? "Rolle entfernen"}
          className={`${ICON_BTN} hover:text-[var(--color-danger)]`}
        >
          <Trash2 size={14} />
        </ConfirmButton>
      </form>
    </span>
  );

  return (
    <div className="space-y-1">
      {zeilen.length === 0 ? (
        <p className="text-xs text-[var(--color-faint)]">Noch keine Rolle.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {zeilen.map((z) => (
            <li key={z.key} className="flex items-center gap-2 py-0.5">
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <span className="truncate">{z.ort}</span>
                <StatusBadge value={z.rolle} />
              </span>
              {z.sperre ? (
                <span className="hidden max-w-[16rem] truncate text-xs text-[var(--color-faint)] sm:inline">
                  {z.sperre}
                </span>
              ) : null}
              {aktionen(z)}
            </li>
          ))}
        </ul>
      )}

      <FormFeedback state={entfernen} />

      {dialog ? (
        <RollenDialog
          userId={userId}
          dialog={dialog}
          freieClubs={freieClubs}
          freieGlobale={freieGlobale}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

/*
  Listenansicht: eine kompakte Zeile je Nutzer. Zugeklappt stehen die Rollen als
  stille Chips rechts; der Stift klappt den Editor (AdminUserRoles) unter der
  Zeile auf und tauscht die Chips gegen „Rolle hinzufügen" — die Zeilen darunter
  zeigen die Rollen ja bereits.
*/
export function NutzerZeile({
  name,
  email,
  aktionen,
  ...rollen
}: RollenProps & {
  name: string;
  email: string;
  /** Weitere Aktionen rechts vom Stift (z. B. Konto löschen). */
  aktionen?: ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  const chips = [
    ...rollen.globalRoles.map((r) => ({ key: `global:${r}`, ort: "Plattform", rolle: r })),
    ...rollen.clubRoles.map((c) => ({ key: `club:${c.clubId}`, ort: c.clubName, rolle: c.rolle })),
  ];

  return (
    <ListRow
      kompakt
      title={name}
      subtitle={email}
      meta={
        <>
          {offen ? (
            <RolleHinzufuegen {...rollen} />
          ) : chips.length === 0 ? (
            <span className="text-xs text-[var(--color-faint)]">keine Rolle</span>
          ) : (
            chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs"
              >
                <span className="text-[var(--color-muted)]">{c.ort}</span>
                <span className="font-medium">{ROLE_LABEL[c.rolle] ?? c.rolle}</span>
              </span>
            ))
          )}
          <button
            type="button"
            onClick={() => setOffen((o) => !o)}
            aria-expanded={offen}
            aria-label={offen ? `Rollen von ${name} schließen` : `Rollen von ${name} bearbeiten`}
            title={offen ? "Schließen" : "Rollen bearbeiten"}
            className={ICON_BTN}
          >
            {offen ? <ChevronUp size={14} /> : <Pencil size={14} />}
          </button>
          {aktionen}
        </>
      }
    >
      {offen ? (
        <div className="border-t border-[var(--color-line)] pt-1">
          <AdminUserRoles {...rollen} />
        </div>
      ) : null}
    </ListRow>
  );
}

/*
  Nur gemountet, solange offen (siehe ActionDialog): jede Öffnung startet mit
  frischem Formular- und Fehlerzustand; Erfolg (state.ok) schließt.
*/
function RollenDialog({
  userId,
  dialog,
  freieClubs,
  freieGlobale,
  onClose,
}: {
  userId: string;
  dialog: Dialog;
  freieClubs: ClubBasic[];
  freieGlobale: string[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    setUserRole,
    {},
  );

  // „Wo?" — "global" oder eine clubId. Beim Ändern steht der Ort fest.
  const [ort, setOrt] = useState<string>(
    dialog.art === "aendern"
      ? dialog.clubId
      : freieGlobale.length > 0
        ? "global"
        : (freieClubs[0]?.id ?? ""),
  );
  const global = dialog.art === "neu" && ort === "global";
  const rollenZurWahl = global ? freieGlobale : [...CLUB_ROLES];
  const [rolle, setRolle] = useState<string>(
    dialog.art === "aendern" ? dialog.rolle : global ? freieGlobale[0] : "member",
  );

  const unveraendert = dialog.art === "aendern" && rolle === dialog.rolle;

  return (
    <ActionDialog onClose={onClose} ok={Boolean(state.ok)}>
      <form action={action} className="space-y-4 p-5">
        <h3 className="text-base font-semibold">
          {dialog.art === "neu" ? "Rolle hinzufügen" : "Rolle ändern"}
        </h3>

        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="scope" value={global ? "global" : "club"} />
        <input type="hidden" name="clubId" value={global ? "" : ort} />

        {dialog.art === "neu" ? (
          <Field label="Wo?">
            <Select
              value={ort}
              onChange={(e) => {
                const neu = e.target.value;
                setOrt(neu);
                setRolle(neu === "global" ? freieGlobale[0] : "member");
              }}
            >
              {freieGlobale.length > 0 ? (
                <option value="global">Plattform (global)</option>
              ) : null}
              {freieClubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="text-sm">
            <span className="text-[var(--color-muted)]">Club:</span>{" "}
            {dialog.clubName}
          </p>
        )}

        <Field label="Rolle">
          <Select
            name="rolle"
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
          >
            {rollenZurWahl.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </Select>
        </Field>

        <FormFeedback state={state} />

        <div className="flex justify-end gap-2">
          <DialogAbbrechen />
          <Button type="submit" size="sm" disabled={pending || unveraendert}>
            {pending ? "…" : dialog.art === "neu" ? "Hinzufügen" : "Speichern"}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
