"use client";

import { useActionState, useState } from "react";
import { CheckSquare } from "lucide-react";
import { MachineCard } from "@/components/machine-card";
import { Button } from "@/components/ui/button";
import {
  assignMachinesToClub,
  type BulkAssignState,
} from "@/db/actions/machines";

/*
  Maschinen-Raster mit optionalem Auswahlmodus, um mehrere Maschinen auf einmal
  einem Club zuzuweisen (z. B. wenn Geräte vor dem Club angelegt wurden). Die
  eigentliche Rechteprüfung passiert serverseitig (assignMachinesToClub) —
  Maschinen, die der Nutzer nicht umhängen darf, werden dort übersprungen.
*/

type Item = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  fotoUrl: string | null;
  clubId: string | null;
  club: { name: string } | null;
  wartungFaellig: number;
};

const selectStyles =
  "rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]";

/* Die Zuweisungs-Leiste. Als eigene, per `key` neu montierte Komponente, damit
   der useActionState-Zustand (Erfolg/Fehler-Meldung) bei jedem neuen Auswahl-
   durchgang frisch startet. */
function BulkAssignBar({
  clubs,
  ids,
  zielClub,
  onZielClub,
  alleAusgewaehlt,
  onAlleUmschalten,
  onDone,
}: {
  clubs: { id: string; name: string }[];
  ids: string[];
  zielClub: string;
  onZielClub: (v: string) => void;
  alleAusgewaehlt: boolean;
  onAlleUmschalten: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<BulkAssignState, FormData>(
    assignMachinesToClub,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
    >
      {ids.map((id) => (
        <input key={id} type="hidden" name="machineIds" value={id} />
      ))}
      <button
        type="button"
        onClick={onAlleUmschalten}
        className="text-sm text-[var(--color-primary)] hover:underline"
      >
        {alleAusgewaehlt ? "Alle abwählen" : "Alle auswählen"}
      </button>
      <span className="text-sm font-medium">{ids.length} ausgewählt</span>
      <select
        name="clubId"
        required
        value={zielClub}
        onChange={(e) => onZielClub(e.target.value)}
        className={selectStyles}
      >
        <option value="" disabled>
          Club wählen…
        </option>
        {clubs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="none">— Aus Club entfernen —</option>
      </select>
      <Button type="submit" disabled={pending || ids.length === 0}>
        {pending ? "Zuweisen…" : "Zuweisen"}
      </Button>
      <button
        type="button"
        onClick={onDone}
        className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        Fertig
      </button>
      {state.error ? (
        <span className="text-sm text-[var(--color-danger)]">{state.error}</span>
      ) : null}
      {state.anzahl != null ? (
        <span className="text-sm text-[var(--color-success)]">
          {state.anzahl} zugewiesen
          {state.uebersprungen
            ? `, ${state.uebersprungen} übersprungen (keine Berechtigung)`
            : ""}
          .
        </span>
      ) : null}
    </form>
  );
}

export function MachinesBoard({
  machines,
  clubs,
}: {
  machines: Item[];
  clubs: { id: string; name: string }[];
}) {
  const [auswahlModus, setAuswahlModus] = useState(false);
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [zielClub, setZielClub] = useState("");
  // Wird bei jedem Start eines Auswahldurchgangs erhöht → frischer Action-State.
  const [sitzung, setSitzung] = useState(0);

  function toggle(id: string) {
    setAuswahl((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function starten() {
    setAuswahl(new Set());
    setZielClub("");
    setSitzung((k) => k + 1);
    setAuswahlModus(true);
  }

  function beenden() {
    setAuswahlModus(false);
    setAuswahl(new Set());
  }

  // „Alle" bezieht sich auf die aktuell angezeigten (ggf. gefilterten) Maschinen.
  const alleAusgewaehlt =
    machines.length > 0 && auswahl.size === machines.length;
  function alleUmschalten() {
    setAuswahl(alleAusgewaehlt ? new Set() : new Set(machines.map((m) => m.id)));
  }

  return (
    <div className="space-y-4">
      {/* Zuweisen ist nur sinnvoll, wenn der Nutzer überhaupt in einem Club ist. */}
      {clubs.length > 0 ? (
        auswahlModus ? (
          <BulkAssignBar
            key={sitzung}
            clubs={clubs}
            ids={[...auswahl]}
            zielClub={zielClub}
            onZielClub={setZielClub}
            alleAusgewaehlt={alleAusgewaehlt}
            onAlleUmschalten={alleUmschalten}
            onDone={beenden}
          />
        ) : (
          <button
            type="button"
            onClick={starten}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
          >
            <CheckSquare size={15} /> Mehrere einem Club zuweisen
          </button>
        )
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {machines.map((m) => (
          <MachineCard
            key={m.id}
            machine={m}
            wartungFaellig={m.wartungFaellig}
            selection={
              auswahlModus
                ? { selected: auswahl.has(m.id), onToggle: () => toggle(m.id) }
                : undefined
            }
            hinweis={
              // Im Zuweisungsmodus markieren, was schon im gewählten Ziel-Club ist.
              auswahlModus &&
              zielClub !== "" &&
              zielClub !== "none" &&
              m.clubId === zielClub
                ? "bereits zugewiesen"
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
