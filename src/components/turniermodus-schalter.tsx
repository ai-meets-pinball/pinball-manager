"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { ActionDialog, DialogAbbrechen } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleTurniermodus } from "@/db/actions/clubs";

/*
  Turniermodus im Kopf der Übersicht — ein Knopf statt einer eigenen Zeile mit
  Pillen je Club. Genau ein verwalteter Club: der Knopf schaltet direkt
  („Turniermodus starten" / „… beenden"). Mehrere Clubs: der Knopf öffnet einen
  Dialog, der fragt, für welchen Club — je Zeile Name, Zustand und Starten/Beenden.
*/
type Club = { id: string; name: string; turniermodus: boolean };

function ToggleForm({ club, size = "sm" }: { club: Club; size?: "sm" | "md" }) {
  return (
    <form action={toggleTurniermodus}>
      <input type="hidden" name="clubId" value={club.id} />
      <Button
        type="submit"
        size={size}
        variant={club.turniermodus ? "danger" : "secondary"}
        title={
          club.turniermodus
            ? `Turniermodus für ${club.name} beenden`
            : `Turniermodus für ${club.name} starten`
        }
      >
        <Trophy size={14} />{" "}
        {club.turniermodus ? "Turniermodus beenden" : "Turniermodus starten"}
      </Button>
    </form>
  );
}

export function TurniermodusSchalter({ clubs }: { clubs: Club[] }) {
  const [offen, setOffen] = useState(false);
  if (clubs.length === 0) return null;
  if (clubs.length === 1) return <ToggleForm club={clubs[0]} />;

  const aktiv = clubs.filter((c) => c.turniermodus).length;
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={aktiv > 0 ? "danger" : "secondary"}
        onClick={() => setOffen(true)}
        title="Turniermodus je Club starten oder beenden"
      >
        <Trophy size={14} /> Turniermodus
        {aktiv > 0 ? ` (${aktiv} aktiv)` : ""}
      </Button>
      {offen ? (
        <ActionDialog onClose={() => setOffen(false)}>
          <div className="space-y-4 p-5">
            <h3 className="text-base font-semibold">Turniermodus — für welchen Club?</h3>
            <ul className="divide-y divide-[var(--color-line)]">
              {clubs.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <Badge tone={c.turniermodus ? "danger" : "muted"}>
                    {c.turniermodus ? "an" : "aus"}
                  </Badge>
                  <ToggleForm club={c} />
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <DialogAbbrechen>Schließen</DialogAbbrechen>
            </div>
          </div>
        </ActionDialog>
      ) : null}
    </>
  );
}
