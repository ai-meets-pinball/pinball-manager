"use client";

import { useActionState, useState } from "react";
import { ModelSearch } from "@/components/model-search";
import { OpdbSearch } from "@/components/opdb-search";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { FormLeaveGuard } from "@/components/ui/form-leave-guard";
import { modellName } from "@/lib/format";
import type { FormState } from "@/db/actions/form-state";

type Club = { id: string; name: string };

/** Katalog-Eintrag für den Besitzer-Picker (siehe getBesitzerKatalog). */
type BesitzerEintrag = {
  id: string;
  name: string;
  email: string | null;
  clubId: string | null;
  userId: string | null;
};

type MachineValues = {
  id: string;
  hersteller: string;
  modell: string;
  baujahr: number | null;
  opdbRef: string | null;
  ipdbRef: string | null;
  clubId: string | null;
  /** Bereits eingetragene Besitzer (n:m) — für die Chip-Vorbelegung. */
  besitzer: { id: string; name: string }[];
  /** Bereits eingetragene Ausstattung/Add-ons — für die Chip-Vorbelegung. */
  ausstattung: { name: string; notiz: string | null }[];
};

/*
  Ein gewählter Besitzer im Formular (Chip). Drei Arten, entsprechend den drei
  Server-Wegen in besitzerAufloesen: bestehender Katalog-Eintrag, Plattform-
  Nutzer, neuer Name (+ optionale E-Mail).
*/
type BesitzerChip =
  | { art: "eintrag"; id: string; name: string }
  | { art: "nutzer"; userId: string; name: string }
  | { art: "neu"; name: string; email: string };

function chipKey(c: BesitzerChip): string {
  if (c.art === "eintrag") return `e:${c.id}`;
  if (c.art === "nutzer") return `u:${c.userId}`;
  return `n:${c.name.toLowerCase()}`;
}

/* Der gewählte Modell (Katalog oder OPDB) — fürs Anzeige-Panel. */
type Auswahl = {
  name: string;
  baujahr: number | null;
  generationName: string | null;
  opdbRef: string;
  ipdbRef: string | null;
  imageUrl: string | null;
  quelle: "katalog" | "opdb";
};

/*
  Anlegen ist AUSWÄHLEN, nicht Eintippen: der Standardweg ist die Katalog-Suche;
  die gewählten Daten (inkl. Generation) werden als Panel ANGEZEIGT und per
  Hidden-Inputs submittet — kein Eingabeformular. Die editierbaren Felder
  erscheinen nur im manuellen Modus (Handeintrag ohne Katalog/OPDB oder
  „Manuell anpassen") und beim Bearbeiten einer bestehenden Maschine.
*/
export function MachineForm({
  action,
  backHref,
  clubs,
  besitzerKatalog,
  mitglieder,
  aktuellerNutzer,
  machine,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Ziel bei „Abbrechen" (Detailseite bzw. Maschinenliste). */
  backHref: string;
  clubs: Club[];
  besitzerKatalog: BesitzerEintrag[];
  /** Club-Mitglieder als wählbare Besitzer (der Besitzer ist oft schon Nutzer). */
  mitglieder: { userId: string; name: string; clubId: string | null }[];
  aktuellerNutzer: { id: string; name: string };
  machine?: MachineValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  /*
    Besitzer-Picker (ein Gerät kann MEHRERE Besitzer haben): die Auswahl lebt
    als Chip-Liste; hinzugefügt wird über ein Select (bisherige Einträge,
    Club-Mitglieder, „neu" = Name + E-Mail). Der Katalog hängt am
    GELTUNGSBEREICH der Maschine — bei einer Club-Maschine stehen die Einträge
    dieses Clubs zur Wahl, bei einer privaten die eigenen. Darum ist die
    Club-Auswahl kontrolliert: wechselt der Club, fallen Chips aus dem alten
    Geltungsbereich weg (neue Namen bleiben — sie entstehen im neuen Scope).
  */
  const [clubSel, setClubSel] = useState(machine?.clubId ?? "");
  const [chips, setChips] = useState<BesitzerChip[]>(() =>
    (machine?.besitzer ?? []).map((b) => ({
      art: "eintrag",
      id: b.id,
      name: b.name,
    })),
  );
  const [pickerSel, setPickerSel] = useState("");
  const [neuName, setNeuName] = useState("");
  const [neuEmail, setNeuEmail] = useState("");

  const besitzerAuswahl = besitzerKatalog.filter(
    (b) =>
      (clubSel ? b.clubId === clubSel : b.clubId === null) &&
      !chips.some((c) => c.art === "eintrag" && c.id === b.id),
  );
  // Nutzer als Besitzer: Club-Maschine → Mitglieder dieses Clubs; private →
  // nur man selbst. Wer schon gewählt ist oder einen verknüpften Katalog-
  // Eintrag hat, taucht nicht (doppelt) auf.
  const nutzerAuswahl = (
    clubSel
      ? mitglieder.filter((m) => m.clubId === clubSel)
      : [
          {
            userId: aktuellerNutzer.id,
            name: aktuellerNutzer.name,
            clubId: null,
          },
        ]
  ).filter(
    (m) =>
      !chips.some((c) => c.art === "nutzer" && c.userId === m.userId) &&
      !besitzerKatalog.some(
        (b) =>
          b.userId === m.userId &&
          (clubSel ? b.clubId === clubSel : b.clubId === null),
      ),
  );

  function addChip(chip: BesitzerChip) {
    setChips((alt) =>
      alt.some((c) => chipKey(c) === chipKey(chip)) ? alt : [...alt, chip],
    );
  }

  function besitzerHinzufuegen() {
    if (pickerSel === "neu") {
      const name = neuName.trim();
      if (!name) return;
      addChip({ art: "neu", name, email: neuEmail.trim() });
      setNeuName("");
      setNeuEmail("");
      setPickerSel("");
      return;
    }
    if (pickerSel.startsWith("user:")) {
      const m = nutzerAuswahl.find((n) => n.userId === pickerSel.slice(5));
      if (m) addChip({ art: "nutzer", userId: m.userId, name: m.name });
    } else if (pickerSel) {
      const b = besitzerAuswahl.find((e) => e.id === pickerSel);
      if (b) addChip({ art: "eintrag", id: b.id, name: b.name });
    }
    setPickerSel("");
  }

  /*
    Ausstattung/Add-ons (1:n je Gerät) — anders als die Besitzer eine reine
    Liste aus Name + optionaler Notiz, kein Katalog, keine Kategorie. Auch hier
    lebt die Auswahl als Chips und geht als Hidden-Input-Paare mit; der Server
    ersetzt den Stand komplett (Formular = Wahrheit). Vorbelegt aus der Maschine.
  */
  const [ausstattungChips, setAusstattungChips] = useState<
    { name: string; notiz: string }[]
  >(() =>
    (machine?.ausstattung ?? []).map((a) => ({
      name: a.name,
      notiz: a.notiz ?? "",
    })),
  );
  const [ausName, setAusName] = useState("");
  const [ausNotiz, setAusNotiz] = useState("");

  function ausstattungHinzufuegen() {
    const name = ausName.trim();
    if (!name) return;
    setAusstattungChips((alt) => [...alt, { name, notiz: ausNotiz.trim() }]);
    setAusName("");
    setAusNotiz("");
  }

  const [vals, setVals] = useState({
    hersteller: machine?.hersteller ?? "",
    modell: machine?.modell ?? "",
    baujahr: machine?.baujahr != null ? String(machine.baujahr) : "",
    opdbRef: machine?.opdbRef ?? "",
    ipdbRef: machine?.ipdbRef ?? "",
  });
  const set = (key: keyof typeof vals) => (value: string) =>
    setVals((v) => ({ ...v, [key]: value }));

  // Frisch gewähltes Modell (Anzeige-Panel + Hidden-Inputs).
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  // Manueller Modus: editierbare Felder (Handeintrag / „Manuell anpassen").
  const [manuell, setManuell] = useState(false);
  /*
    Modell-WAHL zeigen (Katalog-Suche + OPDB)? Beim Anlegen sofort — man muss
    ein Modell wählen. Beim Bearbeiten NICHT: das Modell ist schon definiert und
    wird read-only angezeigt; „Anderes Modell wählen" blendet die Suche ein.
  */
  const [zeigeWahl, setZeigeWahl] = useState(!machine);
  // Beim Bearbeiten liegt immer ein gültiges Modell vor (read-only-Panel),
  // solange nicht gerade neu gewählt wird.
  const bereit =
    Boolean(auswahl) || manuell || (Boolean(machine) && !zeigeWahl);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {machine ? <input type="hidden" name="id" value={machine.id} /> : null}

      {/* Modell-Wahl (Katalog-Suche + OPDB). Beim Anlegen sofort sichtbar; beim
          Bearbeiten erst nach „Anderes Modell wählen" — ein definiertes Modell
          wird read-only angezeigt (kein erneutes Suchen nötig). */}
      {zeigeWahl ? (
        <>
      {/* Primär: der EIGENE Katalog (inkl. Generation + Bild). Das Modell
          wird serverseitig über die OPDB-Referenz aufgelöst (ensureMachineModel). */}
      <ModelSearch
        onSelect={(m) => {
          setVals({
            hersteller: m.hersteller,
            modell: m.modell,
            baujahr: m.baujahr != null ? String(m.baujahr) : "",
            opdbRef: m.opdbRef,
            ipdbRef: m.ipdbRef ?? "",
          });
          setAuswahl({
            name: modellName(m),
            baujahr: m.baujahr,
            generationName: m.generationName,
            opdbRef: m.opdbRef,
            ipdbRef: m.ipdbRef,
            imageUrl: m.imageUrl,
            quelle: "katalog",
          });
          setManuell(false);
          setZeigeWahl(false);
        }}
      />

      {/* Fallback für Modelle, die (noch) nicht im Katalog sind — legt den
          Modell beim Speichern neu an; Generation folgt im Admin. */}
      <details className="text-sm">
        <summary className="cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-fg)]">
          Nicht im Katalog? Aus OPDB übernehmen …
        </summary>
        <div className="pt-2">
          <OpdbSearch
            onSelect={(m) => {
              setVals({
                hersteller: m.hersteller,
                modell: m.modell,
                baujahr: m.baujahr != null ? String(m.baujahr) : "",
                opdbRef: m.opdbRef,
                ipdbRef: m.ipdbRef ?? "",
              });
              setAuswahl({
                name: modellName(m),
                baujahr: m.baujahr,
                generationName: null,
                opdbRef: m.opdbRef,
                ipdbRef: m.ipdbRef,
                imageUrl: m.imageUrl,
                quelle: "opdb",
              });
              setManuell(false);
              setZeigeWahl(false);
            }}
          />
        </div>
      </details>
        </>
      ) : null}

      {auswahl && !manuell ? (
        /* ── Anzeige-Panel: das gewählte Modell (KEIN Eingabeformular). ── */
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
          {/* Die Daten des Typs gehen als Hidden-Inputs mit; die Allowlist für
              das Bild sitzt in machines.ts (img.opdb.org — auch Katalog-Bilder). */}
          <input type="hidden" name="hersteller" value={vals.hersteller} />
          <input type="hidden" name="modell" value={vals.modell} />
          <input type="hidden" name="baujahr" value={vals.baujahr} />
          <input type="hidden" name="opdbRef" value={vals.opdbRef} />
          <input type="hidden" name="ipdbRef" value={vals.ipdbRef} />
          {auswahl.imageUrl ? (
            <input type="hidden" name="opdbImageUrl" value={auswahl.imageUrl} />
          ) : null}

          {auswahl.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={auswahl.imageUrl}
              alt={auswahl.name}
              className="h-20 w-20 shrink-0 rounded-[var(--radius)] object-cover"
            />
          ) : (
            <div className="h-20 w-20 shrink-0 rounded-[var(--radius)] bg-[var(--color-inset)]" />
          )}
          <div className="min-w-0 flex-1 space-y-0.5 text-sm">
            <p className="truncate font-medium">{auswahl.name}</p>
            <p className="text-[var(--color-muted)]">
              {auswahl.baujahr ?? "Baujahr unbekannt"}
            </p>
            <p className="text-[var(--color-muted)]">
              {auswahl.generationName
                ? `Generation: ${auswahl.generationName}`
                : "Generation wird im Admin zugeordnet"}
            </p>
            <p className="font-mono text-xs text-[var(--color-faint)]">
              {auswahl.opdbRef}
              {auswahl.ipdbRef ? ` · IPDB ${auswahl.ipdbRef}` : ""}
            </p>
            {auswahl.imageUrl ? (
              <p className="pt-1 text-xs text-[var(--color-faint)]">
                Bild wird als Foto übernommen, wenn du unten keins hochlädst.
              </p>
            ) : null}
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuswahl(null);
                setZeigeWahl(true);
              }}
              className="text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
            >
              Entfernen
            </button>
            <button
              type="button"
              onClick={() => setManuell(true)}
              className="text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
            >
              Manuell anpassen
            </button>
          </div>
        </div>
      ) : manuell ? (
        /* ── Manueller Modus: editierbare Felder (Handeintrag / Anpassen). ── */
        <>
          <Field label="Hersteller">
            <Input
              name="hersteller"
              required
              value={vals.hersteller}
              onChange={(e) => set("hersteller")(e.target.value)}
            />
          </Field>
          <Field label="Modell">
            <Input
              name="modell"
              required
              value={vals.modell}
              onChange={(e) => set("modell")(e.target.value)}
            />
          </Field>
          <Field label="Baujahr">
            <Input
              name="baujahr"
              type="number"
              value={vals.baujahr}
              onChange={(e) => set("baujahr")(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="OPDB-Referenz">
              <Input
                name="opdbRef"
                value={vals.opdbRef}
                onChange={(e) => set("opdbRef")(e.target.value)}
              />
            </Field>
            <Field label="IPDB-Referenz">
              <Input
                name="ipdbRef"
                value={vals.ipdbRef}
                onChange={(e) => set("ipdbRef")(e.target.value)}
              />
            </Field>
          </div>
          {auswahl?.imageUrl ? (
            <input type="hidden" name="opdbImageUrl" value={auswahl.imageUrl} />
          ) : null}
        </>
      ) : machine && !zeigeWahl ? (
        /* ── Bearbeiten: das bereits definierte Modell — read-only. Kein
             erneutes Suchen nötig; „Anderes Modell wählen" öffnet die Suche,
             „Manuell anpassen" macht die Felder editierbar. ── */
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-3">
          <input type="hidden" name="hersteller" value={vals.hersteller} />
          <input type="hidden" name="modell" value={vals.modell} />
          <input type="hidden" name="baujahr" value={vals.baujahr} />
          <input type="hidden" name="opdbRef" value={vals.opdbRef} />
          <input type="hidden" name="ipdbRef" value={vals.ipdbRef} />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-0.5 text-sm">
              <p className="font-medium">
                {modellName({
                  hersteller: vals.hersteller,
                  modell: vals.modell,
                })}
              </p>
              <p className="text-[var(--color-muted)]">
                {vals.baujahr || "Baujahr unbekannt"}
              </p>
              <p className="font-mono text-xs text-[var(--color-faint)]">
                {vals.opdbRef || "ohne OPDB-Referenz"}
                {vals.ipdbRef ? ` · IPDB ${vals.ipdbRef}` : ""}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-xs">
              <button
                type="button"
                onClick={() => setZeigeWahl(true)}
                className="text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
              >
                Anderes Modell wählen
              </button>
              <button
                type="button"
                onClick={() => setManuell(true)}
                className="text-[var(--color-muted)] underline hover:text-[var(--color-fg)]"
              >
                Manuell anpassen
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Noch nichts gewählt: Hinweis + Weg in den manuellen Modus. ── */
        <p className="text-sm text-[var(--color-muted)]">
          Wähle oben ein Modell aus dem Katalog —{" "}
          <button
            type="button"
            onClick={() => setManuell(true)}
            className="underline hover:text-[var(--color-fg)]"
          >
            oder manuell eingeben
          </button>
          .
        </p>
      )}

      <Field
        label="Club (optional)"
        hint="Geteilt mit den Mitgliedern des Clubs."
      >
        <Select
          name="clubId"
          value={clubSel}
          onChange={(e) => {
            setClubSel(e.target.value);
            // Chips aus dem alten Geltungsbereich passen nicht mehr —
            // neue Namen bleiben, sie entstehen einfach im neuen Scope.
            setChips((alt) => alt.filter((c) => c.art === "neu"));
            setPickerSel("");
          }}
        >
          <option value="">— Nur für mich —</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={`Besitzer (${chips.length})`}
        hint="Wem gehört das Gerät tatsächlich? Ein Gerät kann mehrere Besitzer haben. Rein informativ — vergibt keine Rechte; einmal angelegte Namen bleiben wählbar. Gleicher Name + E-Mail trägt die E-Mail bei einem bestehenden Eintrag nach."
      >
        <div className="space-y-2">
          {/* Die Auswahl geht als Hidden-Inputs mit — je Chip einer seiner drei
              Wege (Eintrag / Nutzer / neuer Name mit E-Mail-Paar). */}
          {chips.map((c) =>
            c.art === "eintrag" ? (
              <input
                key={chipKey(c)}
                type="hidden"
                name="besitzerIds"
                value={c.id}
              />
            ) : c.art === "nutzer" ? (
              <input
                key={chipKey(c)}
                type="hidden"
                name="besitzerUserIds"
                value={c.userId}
              />
            ) : (
              <span key={chipKey(c)}>
                <input type="hidden" name="besitzerNeuName" value={c.name} />
                <input type="hidden" name="besitzerNeuEmail" value={c.email} />
              </span>
            ),
          )}

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span
                  key={chipKey(c)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-sm"
                >
                  {c.name}
                  {c.art === "neu" && c.email ? (
                    <span className="text-xs text-[var(--color-muted)]">
                      {c.email}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`${c.name} entfernen`}
                    onClick={() =>
                      setChips((alt) =>
                        alt.filter((x) => chipKey(x) !== chipKey(c)),
                      )
                    }
                    className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={pickerSel}
              onChange={(e) => setPickerSel(e.target.value)}
              className="min-w-48 flex-1"
            >
              <option value="">— Besitzer wählen —</option>
              {besitzerAuswahl.length > 0 ? (
                <optgroup label="Bisherige Besitzer">
                  {besitzerAuswahl.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.userId
                        ? " · auf der Plattform"
                        : b.email
                          ? ` · ${b.email}`
                          : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {nutzerAuswahl.length > 0 ? (
                <optgroup label={clubSel ? "Club-Mitglieder" : "Du selbst"}>
                  {nutzerAuswahl.map((m) => (
                    <option key={m.userId} value={`user:${m.userId}`}>
                      {m.name}
                      {m.userId === aktuellerNutzer.id ? " (ich)" : ""}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value="neu">+ Neuer Besitzer …</option>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={besitzerHinzufuegen}
              disabled={!pickerSel || (pickerSel === "neu" && !neuName.trim())}
            >
              Hinzufügen
            </Button>
          </div>
          {pickerSel === "neu" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={neuName}
                onChange={(e) => setNeuName(e.target.value)}
                placeholder="Name des Besitzers"
              />
              <Input
                value={neuEmail}
                onChange={(e) => setNeuEmail(e.target.value)}
                type="email"
                placeholder="E-Mail (optional)"
              />
            </div>
          ) : null}
        </div>
      </Field>

      <Field
        label={`Ausstattung (${ausstattungChips.length})`}
        hint="Was ist an genau diesem Gerät zusätzlich verbaut oder dabei (Shaker, Topper, farbige LEDs …)? Name + optionale Notiz, keine Kategorie. Rein informativ — auf der Detailseite wird die Liste nur angezeigt."
      >
        <div className="space-y-2">
          {/* Je Chip ein Hidden-Input-Paar (Name + Notiz) in DOM-Reihenfolge —
              der Server (schreibeAusstattung) ersetzt den Stand komplett. */}
          {ausstattungChips.map((c, i) => (
            <span key={`${c.name}:${i}`}>
              <input type="hidden" name="ausstattungName" value={c.name} />
              <input type="hidden" name="ausstattungNotiz" value={c.notiz} />
            </span>
          ))}

          {ausstattungChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {ausstattungChips.map((c, i) => (
                <span
                  key={`${c.name}:${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-sm"
                >
                  {c.name}
                  {c.notiz ? (
                    <span className="text-xs text-[var(--color-muted)]">
                      {c.notiz}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`${c.name} entfernen`}
                    onClick={() =>
                      setAusstattungChips((alt) =>
                        alt.filter((_, j) => j !== i),
                      )
                    }
                    className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={ausName}
              onChange={(e) => setAusName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ausstattungHinzufuegen();
                }
              }}
              placeholder="z. B. Shaker"
              maxLength={120}
            />
            <Input
              value={ausNotiz}
              onChange={(e) => setAusNotiz(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ausstattungHinzufuegen();
                }
              }}
              placeholder="Notiz (optional)"
              maxLength={300}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={ausstattungHinzufuegen}
              disabled={!ausName.trim()}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      </Field>

      <Field
        label="Foto"
        hint={
          machine?.id
            ? "Leer lassen, um das aktuelle Foto zu behalten."
            : "Optional — überschreibt das Katalog-/OPDB-Bild."
        }
      >
        <Input name="foto" type="file" accept="image/*" />
      </Field>

      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !bereit}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
        <FormLeaveGuard backHref={backHref} />
      </div>
    </form>
  );
}
