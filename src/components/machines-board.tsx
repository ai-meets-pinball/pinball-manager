"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { MachineCard } from "@/components/machine-card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CountPill } from "@/components/ui/count-pill";
import {
  assignMachinesToClub,
  deleteMachines,
  type BulkAssignState,
} from "@/db/actions/machines";
import { modellName } from "@/lib/format";
import { spalteEinheitlich } from "@/lib/tabelle";
import { SortKopf } from "@/components/ui/sort-kopf";

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
  createdAt: Date;
  fotoUrl: string | null;
  clubId: string | null;
  club: { name: string } | null;
  wartungFaellig: number;
  /** Darf der Nutzer diese Maschine umhängen/löschen? Sonst nicht anhakbar. */
  darfUmhaengen: boolean;
};

const LEERE_AUSWAHL: ReadonlySet<string> = new Set();

const KEIN_RECHT =
  "Nur Eigentümer oder Club-Owner/-Admin dürfen diese Maschine umhängen oder löschen";

const selectStyles =
  "rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-primary)]";

/* EINE Sammel-Leiste für beide Aktionen. Vorher waren es zwei Leisten mit
   doppelter Chrome („Alle auswählen", Zähler, „Fertig"); das teilt sich jetzt
   den Rahmen. Die zwei Aktionen bleiben getrennte <form>s nebeneinander —
   jede behält ihren eigenen useActionState (Erfolg/Fehler je Aktion), und
   verschachtelte Formulare sind nicht erlaubt. Serverseitig wird je Maschine
   geprüft; nicht Erlaubtes wird übersprungen. */
function SammelLeiste({
  clubs,
  ids,
  zielClub,
  onZielClub,
  alleAusgewaehlt,
  onAlleUmschalten,
  beendenHref,
}: {
  clubs: { id: string; name: string }[];
  ids: string[];
  zielClub: string;
  onZielClub: (v: string) => void;
  alleAusgewaehlt: boolean;
  onAlleUmschalten: () => void;
  /** Zurück in die normale Liste (Auswahlmodus lebt in der URL). */
  beendenHref: string;
}) {
  const [zuweisen, zuweisenAction, zuweisenLaeuft] = useActionState<
    BulkAssignState,
    FormData
  >(assignMachinesToClub, {});
  const [loeschen, loeschenAction, loeschenLaeuft] = useActionState<
    BulkAssignState,
    FormData
  >(deleteMachines, {});

  const ausgewaehlt = ids.length === 0;
  const meldung = zuweisen.anzahl != null ? zuweisen : loeschen;
  const verb = zuweisen.anzahl != null ? "zugewiesen" : "gelöscht";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <button
        type="button"
        onClick={onAlleUmschalten}
        className="text-sm text-[var(--color-primary)] hover:underline"
      >
        {alleAusgewaehlt ? "Alle abwählen" : "Alle auswählen"}
      </button>
      <span className="text-sm font-medium">{ids.length} ausgewählt</span>

      {/* Zuweisen nur sinnvoll, wenn der Nutzer überhaupt in einem Club ist. */}
      {clubs.length > 0 ? (
        <form action={zuweisenAction} className="flex items-center gap-2">
          {ids.map((id) => (
            <input key={id} type="hidden" name="machineIds" value={id} />
          ))}
          <select
            name="clubId"
            required
            value={zielClub}
            onChange={(e) => onZielClub(e.target.value)}
            aria-label="Ziel-Club"
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
          <Button type="submit" disabled={zuweisenLaeuft || ausgewaehlt}>
            {zuweisenLaeuft ? "Zuweisen…" : "Zuweisen"}
          </Button>
        </form>
      ) : null}

      <form action={loeschenAction}>
        {ids.map((id) => (
          <input key={id} type="hidden" name="machineIds" value={id} />
        ))}
        <ConfirmButton
          question={`${ids.length} Maschine(n) endgültig löschen? Alle zugehörigen Fehler, Reparaturen und Wartungen werden mitgelöscht — das lässt sich nicht rückgängig machen.`}
          confirmLabel="Endgültig löschen"
          disabled={loeschenLaeuft || ausgewaehlt}
          className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
        >
          <Trash2 size={14} /> {loeschenLaeuft ? "Löschen…" : "Löschen"}
        </ConfirmButton>
      </form>

      <Link
        href={beendenHref}
        className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        Fertig
      </Link>

      {zuweisen.error || loeschen.error ? (
        <span className="text-sm text-[var(--color-danger)]">
          {zuweisen.error ?? loeschen.error}
        </span>
      ) : null}
      {meldung.anzahl != null ? (
        <span className="text-sm text-[var(--color-success)]">
          {meldung.anzahl} {verb}
          {meldung.uebersprungen
            ? `, ${meldung.uebersprungen} übersprungen (keine Berechtigung)`
            : ""}
          .
        </span>
      ) : null}
    </div>
  );
}

export function MachinesBoard({
  machines,
  clubs,
  ansicht = "karten",
  sortLinks,
  dir,
  verwalten,
  beendenHref,
}: {
  machines: Item[];
  clubs: { id: string; name: string }[];
  /** Karten (mit Foto) oder kompakte Tabelle (ohne Bilder). */
  ansicht?: "karten" | "tabelle";
  /*
    Fertig gebaute Ziele je sortierbarer Spalte. Die Seite kennt den
    URL-Bauer; hierher kommt nur das Ergebnis, weil Funktionen nicht von einer
    Server- in eine Client-Komponente reichen.
  */
  sortLinks: Record<"neu" | "name" | "jahr", { href: string; aktiv: boolean }>;
  dir: "auf" | "ab";
  /* Der Auswahlmodus lebt in der URL (`?verwalten=1`), damit der Schalter
     dafür oben in der Steuerzeile stehen kann (Server-Komponente) statt hier
     unten über der Liste. */
  verwalten: boolean;
  /** Zurück in die normale Liste. */
  beendenHref: string;
}) {
  const [gewaehlteIds, setGewaehlteIds] = useState<Set<string>>(new Set());
  const [zielClub, setZielClub] = useState("");
  /* Außerhalb des Verwalten-Modus zählt keine Auswahl — abgeleitet statt in
     einem Effekt zurückgesetzt. */
  const auswahl = verwalten ? gewaehlteIds : LEERE_AUSWAHL;

  /* Hängen alle sichtbaren Maschinen im selben Bereich, wiederholt die
     Club-Spalte nur den Filter darüber — dann weg damit. Im Auswahlmodus
     bleibt sie stehen: dort hängt der Hinweis „bereits zugewiesen" daran. */
  const clubSpalte =
    verwalten || !spalteEinheitlich(machines, (m) => m.club?.name ?? "privat");

  function toggle(id: string) {
    setGewaehlteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // „Alle" bezieht sich auf die aktuell angezeigten (ggf. gefilterten) Maschinen
  // — und nur auf die, die man auch anhaken darf.
  const anhakbar = machines.filter((m) => m.darfUmhaengen);
  const alleAusgewaehlt =
    anhakbar.length > 0 && auswahl.size === anhakbar.length;
  function alleUmschalten() {
    setGewaehlteIds(
      alleAusgewaehlt ? new Set() : new Set(anhakbar.map((m) => m.id)),
    );
  }

  return (
    <div className="space-y-4">
      {/* Sammelaktionen: EINE Leiste, sichtbar nur im Verwalten-Modus. Der
          Einstieg dazu sitzt oben in der Steuerzeile (Knopf „Verwalten"). */}
      {verwalten ? (
        <SammelLeiste
          clubs={clubs}
          ids={[...auswahl]}
          zielClub={zielClub}
          onZielClub={setZielClub}
          alleAusgewaehlt={alleAusgewaehlt}
          onAlleUmschalten={alleUmschalten}
          beendenHref={beendenHref}
        />
      ) : null}

      {ansicht === "tabelle" ? (
        /* Kompakte Tabellen-Ansicht (ohne Bilder) — schnelles Scannen; die
           Mehrfach-Auswahl funktioniert auch hier (Checkbox-Spalte). */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-[0.06em] text-[var(--color-muted)]">
                {verwalten ? <th className="w-8 py-2" /> : null}
                <SortKopf
                  label="Modell"
                  aktiv={sortLinks.name.aktiv}
                  dir={dir}
                  href={sortLinks.name.href}
                />
                <SortKopf
                  label="Baujahr"
                  aktiv={sortLinks.jahr.aktiv}
                  dir={dir}
                  href={sortLinks.jahr.href}
                />
                <SortKopf
                  label="Hinzugefügt"
                  aktiv={sortLinks.neu.aktiv}
                  dir={dir}
                  href={sortLinks.neu.href}
                />
                {clubSpalte ? (
                  <th className="py-2 pr-4 font-medium">Club</th>
                ) : null}
                <th className="py-2 font-medium">Wartung</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--color-border)] align-middle hover:bg-[var(--color-surface-2)]"
                >
                  {verwalten ? (
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={auswahl.has(m.id)}
                        onChange={() => toggle(m.id)}
                        disabled={!m.darfUmhaengen}
                        title={m.darfUmhaengen ? undefined : KEIN_RECHT}
                        aria-label={`${modellName(m)} auswählen`}
                        className="accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
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
                    {m.createdAt.toLocaleDateString("de-DE")}
                  </td>
                  {clubSpalte ? (
                    <td className="py-2 pr-4 text-[var(--color-muted)]">
                      {m.club?.name ?? "privat"}
                      {verwalten &&
                      zielClub !== "" &&
                      zielClub !== "none" &&
                      m.clubId === zielClub
                        ? " · bereits zugewiesen"
                        : ""}
                    </td>
                  ) : null}
                  <td className="py-2">
                    {m.wartungFaellig > 0 ? (
                      <CountPill n={`${m.wartungFaellig} fällig`} tone="danger" />
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
                verwalten
                  ? {
                      selected: auswahl.has(m.id),
                      onToggle: () => toggle(m.id),
                      gesperrt: m.darfUmhaengen ? null : KEIN_RECHT,
                    }
                  : undefined
              }
              hinweis={
                // Im Zuweisungsmodus markieren, was schon im gewählten Ziel-Club ist.
                verwalten &&
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
