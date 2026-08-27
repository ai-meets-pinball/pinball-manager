import Link from "next/link";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Pencil, Trash2 } from "lucide-react";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShareRepairControl } from "@/components/share-repair-control";
import { deleteRepair } from "@/db/actions/repairs";
import type { ShareDefaults } from "@/lib/share-defaults";

type Repair = {
  id: string;
  datum: Date;
  diagnose: string | null;
  massnahme: string | null;
  teile: string | null;
  kosten: string | null;
  zeit: number | null;
  status: string;
  faults: { beschreibung: string }[];
};

/* Optional: Teilen-Schalter je Reparatur. Bewusst als reine Daten übergeben
   (keine Render-Funktion), damit diese Server-Komponente die Client-Komponente
   ShareRepairControl selbst rendern kann. */
type TeilenProps = {
  clubs: { id: string; name: string }[];
  defaults: ShareDefaults;
  shares: Record<
    string,
    { scope: string; anonym: boolean; zeigeKosten: boolean }
  >;
};

/* Reparaturen eines Geräts als List/ListRow — der Reiter-Kopf (＋ Neue
   Reparatur) rendert die Seite. Titel = die behobenen Fehler (oder „Reparatur");
   Diagnose/Maßnahme/Teile/Kosten/Zeit und der Teilen-Schalter liegen im
   Vollbreiten-Slot darunter. */
export function RepairList({
  repairs,
  machineId,
  teilen,
  schreibbar = true,
}: {
  repairs: Repair[];
  machineId: string;
  teilen?: TeilenProps;
  /** false = nur Lesen: keine Bearbeiten-/Lösch-Aktionen. */
  schreibbar?: boolean;
}) {
  return (
    <List empty="Keine Reparaturen erfasst.">
      {repairs.map((repair) => (
        <ListRow
          key={repair.id}
          titleWrap
          title={
            repair.faults.length > 0
              ? repair.faults.map((f) => f.beschreibung).join(" · ")
              : "Reparatur"
          }
          subtitle={repair.datum.toLocaleDateString("de-DE")}
          meta={<StatusBadge value={repair.status} />}
          actions={
            schreibbar ? (
              <>
                <Link
                  href={`/machines/${machineId}/repairs/${repair.id}/edit`}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  <Pencil size={14} /> Bearbeiten
                </Link>
                <form action={deleteRepair}>
                  <input type="hidden" name="machineId" value={machineId} />
                  <input type="hidden" name="id" value={repair.id} />
                  <ConfirmButton
                    question="Diese Reparatur löschen?"
                    confirmLabel="Ja, löschen"
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={14} /> Löschen
                  </ConfirmButton>
                </form>
              </>
            ) : null
          }
        >
          {repair.diagnose ? (
            <p className="whitespace-pre-line break-words">
              <span className="text-xs font-medium text-[var(--color-muted)]">
                Diagnose:{" "}
              </span>
              {repair.diagnose}
            </p>
          ) : null}
          {repair.massnahme ? (
            <p className="whitespace-pre-line break-words">
              <span className="text-xs font-medium text-[var(--color-muted)]">
                Maßnahme:{" "}
              </span>
              {repair.massnahme}
            </p>
          ) : null}

          {repair.teile || repair.kosten || repair.zeit != null ? (
            <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
              {repair.teile ? <span>Teile: {repair.teile}</span> : null}
              {repair.kosten ? <span>Kosten: {repair.kosten} €</span> : null}
              {repair.zeit != null ? <span>Zeit: {repair.zeit} min</span> : null}
            </div>
          ) : null}

          {teilen ? (
            <ShareRepairControl
              machineId={machineId}
              repairId={repair.id}
              vorschau={{
                diagnose: repair.diagnose,
                massnahme: repair.massnahme,
                teile: repair.teile,
                kosten: repair.kosten,
                zeit: repair.zeit,
              }}
              aktuell={teilen.shares[repair.id] ?? null}
              defaults={teilen.defaults}
              clubs={teilen.clubs}
            />
          ) : null}
        </ListRow>
      ))}
    </List>
  );
}
