"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  SCORECARD_FORMATS,
  formatePassendZuHersteller,
} from "@/lib/scorecard-formats";

/*
  Druck-Studio für den QR-Melde-Code: druckt exakt physisch — entweder ein
  EIGENES Etikett (frei wählbare mm-Maße, Hoch-/Querformat) oder eine SCORECARD
  in herstellerspezifischen Maßen (lib/scorecard-formats.ts). Es wird immer
  genau EINE Karte gedruckt.

  Scorecards liegen im Kartenhalter IMMER quer → die Maße werden auf Querformat
  normalisiert (Breite ≥ Höhe). Das Format wählt man über eine durchsuchbare
  Liste (nicht über ein unhandliches Dropdown); vorbelegt ist der Herstellername.

  Kern ist ein dynamisch injiziertes `@page { size: <B>mm <H>mm }` plus eine
  Print-Media-Regel, die alles außer der Karte ausblendet (Visibility-Trick —
  robust gegen das globale App-Layout). Der Style-Inhalt besteht nur aus
  Zahlen/festen Strings (kein Nutzer-HTML → kein XSS). Der QR ist das
  serverseitig erzeugte Vektor-SVG und wird über `preserveAspectRatio` immer
  vollständig eingepasst — nie beschnitten.
*/
const HINWEIS = "Defekt? QR scannen & Fehler melden — auch ohne Konto.";
const PX_PRO_MM = 96 / 25.4; // CSS-Referenz (96 dpi)

type Modus = "etikett" | "scorecard";

export function QrPrint({
  qrSvg,
  name,
  logoDataUrl,
  hersteller,
}: {
  qrSvg: string;
  name: string;
  logoDataUrl: string | null;
  hersteller: string;
}) {
  const [modus, setModus] = useState<Modus>("etikett");

  // Etikett-Parameter (frei).
  const [breite, setBreite] = useState("90");
  const [hoehe, setHoehe] = useState("60");
  const [quer, setQuer] = useState(false);

  // Scorecard-Auswahl: vorbelegte Suche + gewähltes Format.
  const vorschlaege = useMemo(
    () => formatePassendZuHersteller(hersteller),
    [hersteller],
  );
  const [suche, setSuche] = useState(() =>
    vorschlaege.length ? hersteller.trim().split(/[\s/,]+/)[0] : "",
  );
  const [formatId, setFormatId] = useState(
    () => vorschlaege[0]?.id ?? SCORECARD_FORMATS[0].id,
  );
  // Auswahlliste ist eingeklappt, bis man sie öffnet; die Wahl klappt sie zu.
  const [formatOffen, setFormatOffen] = useState(false);

  // Seitenmodus: exakte Kartengröße (Etiketten-/Kartendrucker) ODER A4 mit
  // Schnittmarken (auf jedem Bürodrucker, danach ausschneiden).
  const [blatt, setBlatt] = useState<"exakt" | "a4">("exakt");

  // Inhalts-Schalter.
  const [zeigeName, setZeigeName] = useState(true);
  const [zeigeHinweis, setZeigeHinweis] = useState(true);
  const [zeigeLogo, setZeigeLogo] = useState(false);
  // Logo-Position relativ zum QR: oben, links oder rechts.
  const [logoPos, setLogoPos] = useState<"oben" | "links" | "rechts">("oben");
  // Schriftgröße als Faktor auf die automatische Basisgröße (0,6×–2,0×).
  const [schriftFaktor, setSchriftFaktor] = useState(1);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return SCORECARD_FORMATS;
    return SCORECARD_FORMATS.filter(
      (f) =>
        f.hersteller.toLowerCase().includes(q) ||
        f.kartentyp.toLowerCase().includes(q),
    );
  }, [suche]);

  // Effektive Kartenmaße (mm). Scorecards: IMMER quer (Breite ≥ Höhe).
  const { breiteMm, hoeheMm } = useMemo(() => {
    if (modus === "scorecard") {
      const f =
        SCORECARD_FORMATS.find((x) => x.id === formatId) ??
        SCORECARD_FORMATS[0];
      return {
        breiteMm: Math.max(f.breiteMm, f.hoeheMm),
        hoeheMm: Math.min(f.breiteMm, f.hoeheMm),
      };
    }
    const b = Number(breite) || 0;
    const h = Number(hoehe) || 0;
    return quer
      ? { breiteMm: Math.max(b, h), hoeheMm: Math.min(b, h) }
      : { breiteMm: b, hoeheMm: h };
  }, [modus, formatId, breite, hoehe, quer]);

  const gueltig = breiteMm >= 10 && hoeheMm >= 10;
  const gewaehlt =
    SCORECARD_FORMATS.find((x) => x.id === formatId) ?? SCORECARD_FORMATS[0];

  // Dynamisches Print-CSS: @page-Größe (exakt = Kartengröße, a4 = A4) + „nur
  // die Karte/das Blatt sichtbar".
  const printCss = gueltig
    ? `@page { size: ${blatt === "a4" ? "A4" : `${breiteMm}mm ${hoeheMm}mm`}; margin: 0; }
@media print {
  html, body { background: #ffffff; }
  body * { visibility: hidden !important; }
  #qr-print-root, #qr-print-root * { visibility: visible !important; }
  #qr-print-root { position: fixed !important; inset: 0 !important; margin: 0 !important; }
  /* Hintergrundfarben (Schnittmarken) auch wirklich drucken. */
  #qr-print-root, #qr-print-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}`
    : "";

  // Vorschau-Skalierung: größte Kante ~ 320 px auf dem Bildschirm.
  const skala = gueltig
    ? Math.min(1, 320 / (Math.max(breiteMm, hoeheMm) * PX_PRO_MM))
    : 1;

  // Logo neben dem QR (links/rechts) → Reihe statt Spalte im Mittelteil.
  const mitLogoSeite =
    zeigeLogo &&
    Boolean(logoDataUrl) &&
    (logoPos === "links" || logoPos === "rechts");
  const logoOben = logoDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoDataUrl}
      alt=""
      style={{
        maxHeight: "16%",
        maxWidth: "60%",
        objectFit: "contain",
        flex: "0 0 auto",
      }}
    />
  ) : null;
  // Seitliches Logo bekommt eine EIGENE HÄLFTE (flex 1) und wird darin zentriert
  // — genau wie der QR in seiner Hälfte (siehe Mittelteil: QR ebenfalls flex 1).
  const logoSeite = logoDataUrl ? (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoDataUrl}
        alt=""
        style={{ maxHeight: "100%", maxWidth: "90%", objectFit: "contain" }}
      />
    </div>
  ) : null;

  // Eine Karte in echten mm — Layout ist Spalte: Name / Mittelteil (QR +
  // optional Logo) / Hinweis. Der QR wird per meet immer vollständig
  // eingepasst (nie beschnitten).
  const karte = (
    <div
      className="qr-karte"
      style={{
        width: `${breiteMm}mm`,
        height: `${hoeheMm}mm`,
        boxSizing: "border-box",
        padding: "3mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5mm",
        overflow: "hidden",
        background: "#ffffff",
        color: "#000000",
        // Basisgröße aus der kleinsten Kante, per Regler skaliert.
        fontSize: `${Math.min(breiteMm, hoeheMm) * 0.07 * schriftFaktor}mm`,
      }}
    >
      {zeigeName ? (
        <p
          style={{
            fontWeight: 700,
            lineHeight: 1.1,
            textAlign: "center",
            wordBreak: "break-word",
            flex: "0 0 auto",
          }}
        >
          {name}
        </p>
      ) : null}
      {/* Mittelteil: QR (füllt den Rest) + optional das Logo. Bei „oben"
          stapelt es über dem QR (Spalte), bei „links"/„rechts" daneben (Reihe).
          Der QR wird per meet immer vollständig eingepasst (nie beschnitten). */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          alignSelf: "stretch",
          display: "flex",
          flexDirection: mitLogoSeite ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2mm",
        }}
      >
        {zeigeLogo && logoDataUrl && logoPos === "links" ? logoSeite : null}
        {zeigeLogo && logoDataUrl && logoPos === "oben" ? logoOben : null}
        <div
          className="[&_svg]:h-full [&_svg]:w-full"
          style={{
            // Bei seitlichem Logo eine gleich große Hälfte (1 1 0) wie das Logo;
            // sonst füllt der QR den ganzen Mittelteil.
            flex: mitLogoSeite ? "1 1 0" : "1 1 auto",
            minHeight: 0,
            minWidth: 0,
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          // QR-SVG stammt aus der qrcode-Bibliothek (Server), kein Nutzer-Input.
          // Das SVG hat viewBox + Default preserveAspectRatio „xMidYMid meet" →
          // es wird immer VOLLSTÄNDIG (quadratisch, zentriert) eingepasst.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        {zeigeLogo && logoDataUrl && logoPos === "rechts" ? logoSeite : null}
      </div>
      {zeigeHinweis ? (
        <p
          style={{
            fontSize: "0.75em",
            textAlign: "center",
            lineHeight: 1.15,
            flex: "0 0 auto",
          }}
        >
          {HINWEIS}
        </p>
      ) : null}
    </div>
  );

  // Schnittmarken (nur im A4-Modus): 8 kurze Striche an den Kartenecken,
  // je Ecke ein waagerechter + ein senkrechter, knapp außerhalb der Karte.
  const MARKE_MM = 4;
  const marke = (s: CSSProperties, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        background: "#000",
        // Browser drucken Hintergrundfarben sonst NICHT — sonst wären die
        // Marken im echten Druck unsichtbar.
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        ...s,
      }}
    />
  );
  const schnittmarken = [
    marke(
      {
        left: `-${MARKE_MM}mm`,
        top: 0,
        width: `${MARKE_MM}mm`,
        height: "0.2mm",
      },
      "tl-h",
    ),
    marke(
      {
        top: `-${MARKE_MM}mm`,
        left: 0,
        width: "0.2mm",
        height: `${MARKE_MM}mm`,
      },
      "tl-v",
    ),
    marke(
      {
        right: `-${MARKE_MM}mm`,
        top: 0,
        width: `${MARKE_MM}mm`,
        height: "0.2mm",
      },
      "tr-h",
    ),
    marke(
      {
        top: `-${MARKE_MM}mm`,
        right: 0,
        width: "0.2mm",
        height: `${MARKE_MM}mm`,
      },
      "tr-v",
    ),
    marke(
      {
        left: `-${MARKE_MM}mm`,
        bottom: 0,
        width: `${MARKE_MM}mm`,
        height: "0.2mm",
      },
      "bl-h",
    ),
    marke(
      {
        bottom: `-${MARKE_MM}mm`,
        left: 0,
        width: "0.2mm",
        height: `${MARKE_MM}mm`,
      },
      "bl-v",
    ),
    marke(
      {
        right: `-${MARKE_MM}mm`,
        bottom: 0,
        width: `${MARKE_MM}mm`,
        height: "0.2mm",
      },
      "br-h",
    ),
    marke(
      {
        bottom: `-${MARKE_MM}mm`,
        right: 0,
        width: "0.2mm",
        height: `${MARKE_MM}mm`,
      },
      "br-v",
    ),
  ];

  // Die Karte inkl. Marken (A4) bzw. pur (exakt).
  const kartenBox =
    blatt === "a4" ? (
      <div
        style={{
          position: "relative",
          width: `${breiteMm}mm`,
          height: `${hoeheMm}mm`,
        }}
      >
        {karte}
        {schnittmarken}
      </div>
    ) : (
      karte
    );

  return (
    <div className="space-y-4">
      {gueltig ? (
        <style
          media="print"
          // Nur generierte Zahlen/Strings — kein Nutzer-HTML.
          dangerouslySetInnerHTML={{ __html: printCss }}
        />
      ) : null}

      {/* ── Konfiguration (nicht drucken) ────────────────────────────────── */}
      <div className="space-y-4 print:hidden">
        <div className="flex gap-1.5">
          {(
            [
              ["etikett", "Etikett (frei)"],
              ["scorecard", "Scorecard"],
            ] as const
          ).map(([wert, label]) => (
            <button
              key={wert}
              type="button"
              onClick={() => setModus(wert)}
              aria-pressed={modus === wert}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                modus === wert
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {modus === "etikett" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Breite (mm)">
              <Input
                type="number"
                min={10}
                max={500}
                value={breite}
                onChange={(e) => setBreite(e.target.value)}
              />
            </Field>
            <Field label="Höhe (mm)">
              <Input
                type="number"
                min={10}
                max={500}
                value={hoehe}
                onChange={(e) => setHoehe(e.target.value)}
              />
            </Field>
            <Field label="Ausrichtung">
              <Select
                value={quer ? "quer" : "hoch"}
                onChange={(e) => setQuer(e.target.value === "quer")}
              >
                <option value="hoch">Hochformat</option>
                <option value="quer">Querformat</option>
              </Select>
            </Field>
          </div>
        ) : (
          <Field label="Kartenformat" hint="Immer im Querformat gedruckt.">
            {!formatOffen ? (
              // Eingeklappt: das gewählte Format kompakt, Klick öffnet die Wahl.
              <button
                type="button"
                onClick={() => setFormatOffen(true)}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm hover:border-[var(--color-primary)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {gewaehlt.hersteller}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {gewaehlt.kartentyp}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-2">
                  <span className="font-mono text-xs text-[var(--color-faint)]">
                    {Math.max(gewaehlt.breiteMm, gewaehlt.hoeheMm)}×
                    {Math.min(gewaehlt.breiteMm, gewaehlt.hoeheMm)} mm
                  </span>
                  <ChevronDown
                    size={16}
                    className="text-[var(--color-muted)]"
                  />
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                  />
                  <Input
                    autoFocus
                    value={suche}
                    onChange={(e) => setSuche(e.target.value)}
                    placeholder="Filtern: Williams, Stern, Score …"
                    className="pl-9"
                  />
                </div>
                <ul className="max-h-64 divide-y divide-[var(--color-border)] overflow-y-auto rounded-[var(--radius)] border border-[var(--color-border)]">
                  {gefiltert.map((f) => {
                    const aktiv = f.id === formatId;
                    const b = Math.max(f.breiteMm, f.hoeheMm);
                    const h = Math.min(f.breiteMm, f.hoeheMm);
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFormatId(f.id);
                            setFormatOffen(false); // Wahl → wieder einklappen.
                          }}
                          aria-current={aktiv ? "true" : undefined}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                            aktiv
                              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                              : "hover:bg-[var(--color-border)]/40"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {f.hersteller}
                            </span>
                            <span className="block truncate text-xs text-[var(--color-muted)]">
                              {f.kartentyp}
                            </span>
                          </span>
                          <span className="flex-none font-mono text-xs text-[var(--color-faint)]">
                            {b}×{h} mm
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {gefiltert.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-[var(--color-muted)]">
                      Nichts gefunden.
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </Field>
        )}

        {/* Inhalt der Karte. */}
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={zeigeName}
              onChange={(e) => setZeigeName(e.target.checked)}
            />
            Name
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={zeigeHinweis}
              onChange={(e) => setZeigeHinweis(e.target.checked)}
            />
            Hinweistext
          </label>
          {logoDataUrl ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={zeigeLogo}
                onChange={(e) => setZeigeLogo(e.target.checked)}
              />
              Club-Logo
            </label>
          ) : null}
        </div>

        {/* Logo-Position (nur wenn Logo aktiv). */}
        {logoDataUrl && zeigeLogo ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[var(--color-muted)]">Logo:</span>
            {(
              [
                ["oben", "oben"],
                ["links", "links"],
                ["rechts", "rechts"],
              ] as const
            ).map(([wert, label]) => (
              <button
                key={wert}
                type="button"
                onClick={() => setLogoPos(wert)}
                aria-pressed={logoPos === wert}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  logoPos === wert
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Schriftgröße (Name + Hinweis). */}
        {zeigeName || zeigeHinweis ? (
          <label className="flex max-w-xs items-center gap-3 text-sm">
            <span className="whitespace-nowrap">Schriftgröße</span>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              value={schriftFaktor}
              onChange={(e) => setSchriftFaktor(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono text-xs text-[var(--color-muted)]">
              {schriftFaktor.toFixed(1)}×
            </span>
          </label>
        ) : null}

        {/* Seitenmodus. */}
        <Field
          label="Seite"
          hint={
            blatt === "a4"
              ? "Karte mittig auf A4 mit Schnittmarken — auf jedem Bürodrucker druckbar, danach ausschneiden."
              : "Seitengröße = Kartengröße — für Etiketten-/Kartendrucker."
          }
        >
          <div className="max-w-xs">
            <Select
              value={blatt}
              onChange={(e) => setBlatt(e.target.value as "exakt" | "a4")}
            >
              <option value="exakt">Exakt (Kartengröße)</option>
              <option value="a4">A4 mit Schnittmarken</option>
            </Select>
          </div>
        </Field>

        {/* Vorschau + Druck. */}
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Vorschau ({breiteMm || "–"}×{hoeheMm || "–"} mm)
            </p>
            {gueltig ? (
              <div
                className="rounded-[var(--radius)] border border-[var(--color-border)]"
                style={{
                  // Im A4-Modus etwas Rand, damit die Schnittmarken sichtbar sind.
                  width:
                    (breiteMm + (blatt === "a4" ? 2 * MARKE_MM : 0)) *
                    PX_PRO_MM *
                    skala,
                  height:
                    (hoeheMm + (blatt === "a4" ? 2 * MARKE_MM : 0)) *
                    PX_PRO_MM *
                    skala,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    transform: `scale(${skala})`,
                    transformOrigin: "top left",
                    padding: blatt === "a4" ? `${MARKE_MM}mm` : 0,
                  }}
                >
                  {kartenBox}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-danger)]">
                Bitte gültige Maße angeben (mind. 10 mm).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              onClick={() => window.print()}
              disabled={!gueltig}
            >
              <Printer size={16} /> Drucken
            </Button>
            <p className="max-w-xs text-xs text-[var(--color-muted)]">
              {blatt === "a4"
                ? "Auf A4 drucken, im Dialog „tatsächliche Größe / 100 %“ (nicht „an Seite anpassen“) und Ränder 0 wählen, dann an den Marken ausschneiden."
                : "Im Druckdialog die Papiergröße auf die angezeigten Maße stellen (bzw. den Etiketten-/Kartendrucker wählen) und Ränder auf 0 — dann kommt der Druck maßstabsgetreu."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Druck-Wurzel. Auf dem Bildschirm off-canvas; im Druck macht das
             Print-CSS sie sichtbar. Exakt: nur die Karte (füllt die
             kartengroße Seite). A4: die Karte mittig auf einer A4-Seite mit
             Schnittmarken. ─────────────────────────────────────────────── */}
      {gueltig ? (
        <div
          id="qr-print-root"
          aria-hidden
          style={{ position: "absolute", left: "-99999px", top: 0 }}
        >
          {blatt === "a4" ? (
            <div
              style={{
                width: "210mm",
                height: "297mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
              }}
            >
              {kartenBox}
            </div>
          ) : (
            kartenBox
          )}
        </div>
      ) : null}
    </div>
  );
}
