"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CheckSquare, Trash2 } from "lucide-react";
import { MachineCard } from "@/components/machine-card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  assignMachinesToClub,
  deleteMachines,
  type BulkAssignState,
} from "@/db/actions/machines";
import { modellName } from "@/lib/format";

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

/* Die Lösch-Leiste — dieselbe Auswahl-Mechanik wie beim Zuweisen, aber mit
   Pflicht-Bestätigung (ConfirmButton) und danger-Rahmen. Serverseitig wird je
   Maschine geprüft; nicht erlaubte werden übersprungen. */
function BulkDeleteBar({
  ids,
  alleAusgewaehlt,
  onAlleUmschalten,
  onDone,
}: {
  ids: string[];
  alleAusgewaehlt: boolean;
  onAlleUmschalten: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<BulkAssignState, FormData>(
    deleteMachines,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--color-danger)] bg-[var(--color-surface-2)] p-3"
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
      <ConfirmButton
        question={`${ids.length} Maschine(n) endgültig löschen? Alle zugehörigen Fehler, Reparaturen und Wartungen werden mitgelöscht — das lässt sich nicht rückgängig machen.`}
        confirmLabel="Endgültig löschen"
        disabled={pending || ids.length === 0}
        className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
      >
        <Trash2 size={14} /> {pending ? "Löschen…" : "Löschen"}
      </ConfirmButton>
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
          {state.anzahl} gelöscht
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
  ansicht = "karten",
}: {
  machines: Item[];
  clubs: { id: string; name: string }[];
  /** Karten (mit Foto) oder kompakte Tabelle (ohne Bilder). */
  ansicht?: "karten" | "tabelle";
}) {
  const [auswahlModus, setAuswahlModus] = useState(false);
  const [aktion, setAktion] = useState<"zuweisen" | "loeschen">("zuweisen");
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

  function starten(a: "zuweisen" | "loeschen") {
    setAktion(a);
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
      {/* Sammelaktionen — bewusst leise (Text-Links): seltene Verwaltung soll die
         Liste nicht dominieren. Die Rechte werden serverseitig je Maschine geprüft. */}
      {auswahlModus ? (
        aktion === "zuweisen" ? (
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
          <BulkDeleteBar
            key={sitzung}
            ids={[...auswahl]}
            alleAusgewaehlt={alleAusgewaehlt}
            onAlleUmschalten={alleUmschalten}
            onDone={beenden}
          />
        )
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          {/* Zuweisen nur sinnvoll, wenn der Nutzer überhaupt in einem Club ist. */}
          {clubs.length > 0 ? (
            <button
              type="button"
              onClick={() => starten("zuweisen")}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <CheckSquare size={13} /> Mehrere einem Club zuweisen
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => starten("loeschen")}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            <Trash2 size={13} /> Mehrere löschen
          </button>
        </div>
      )}

      {ansicht === "tabelle" ? (
        /* Kompakte Tabellen-Ansicht (ohne Bilder) — schnelles Scannen; die
           Mehrfach-Auswahl funktioniert auch hier (Checkbox-Spalte). */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--color-muted)]">
                {auswahlModus ? <th className="w-8 py-2" /> : null}
                <th className="py-2 pr-4 font-medium">Modell</th>
                <th className="py-2 pr-4 font-medium">Baujahr</th>
                <th className="py-2 pr-4 font-medium">Club</th>
                <th className="py-2 font-medium">Wartung</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--color-border)] align-middle hover:bg-[var(--color-surface-2)]"
                >
                  {auswahlModus ? (
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={auswahl.has(m.id)}
                        onChange={() => toggle(m.id)}
                        aria-label={`${modellName(m)} auswählen`}
                        className="accent-[var(--color-accent)]"
                      />
                    </td>
                  ) : null}
                  <td className="py-2 pr-4">
                    <Link
                      href={`/machines/${m.id}`}
                      className="font-medium hover:underline"
                    >
                      {modellName(m)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{m.baujahr ?? "—"}</td>
                  <td className="py-2 pr-4 text-[var(--color-muted)]">
                    {m.club?.name ?? "privat"}
                    {auswahlModus &&
                    zielClub !== "" &&
                    zielClub !== "none" &&
                    m.clubId === zielClub
                      ? " · bereits zugewiesen"
                      : ""}
                  </td>
                  <td className="py-2">
                    {m.wartungFaellig > 0 ? (
                      <span className="rounded-full border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-danger)]">
                        {m.wartungFaellig} fällig
                      </span>
                    ) : (
                      <span className="text-[var(--color-faint)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
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
      )}
    </div>
  );
}
