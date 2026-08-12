"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, Plus, Printer, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  qrKarteFuerMaschine,
  sucheMeineMaschinen,
} from "@/db/actions/qr-karten";
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
const EINSTELLUNGEN_KEY = "qr-print-einstellungen";

type Modus = "etikett" | "scorecard";

type Karte = { id: string; name: string; qrSvg: string };

export function QrPrint({
  machineId,
  qrSvg,
  name,
  logoDataUrl,
  hersteller,
}: {
  machineId: string;
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

  // „Look"-Einstellungen sind maschinenUNabhängig → in localStorage merken,
  // damit das nächste Etikett (auch anderer Maschinen) so vorbelegt ist.
  // Initial-Render nutzt bewusst die Defaults (SSR-gleich); nach dem Mount wird
  // geladen und gesetzt. Nur der QR/Name/Logo selbst kommt je Maschine aus Props.
  const [geladen, setGeladen] = useState(false);
  useEffect(() => {
    try {
      const roh = localStorage.getItem(EINSTELLUNGEN_KEY);
      if (roh) {
        const s = JSON.parse(roh);
        if (s.modus === "etikett" || s.modus === "scorecard") setModus(s.modus);
        if (typeof s.breite === "string") setBreite(s.breite);
        if (typeof s.hoehe === "string") setHoehe(s.hoehe);
        if (typeof s.quer === "boolean") setQuer(s.quer);
        if (SCORECARD_FORMATS.some((f) => f.id === s.formatId))
          setFormatId(s.formatId);
        if (typeof s.zeigeName === "boolean") setZeigeName(s.zeigeName);
        if (typeof s.zeigeHinweis === "boolean")
          setZeigeHinweis(s.zeigeHinweis);
        if (typeof s.zeigeLogo === "boolean") setZeigeLogo(s.zeigeLogo);
        if (["oben", "links", "rechts"].includes(s.logoPos))
          setLogoPos(s.logoPos);
        if (typeof s.schriftFaktor === "number")
          setSchriftFaktor(s.schriftFaktor);
        if (s.blatt === "exakt" || s.blatt === "a4") setBlatt(s.blatt);
      }
    } catch {
      /* defektes/gesperrtes localStorage → Defaults */
    }
    setGeladen(true);
  }, []);
  useEffect(() => {
    if (!geladen) return; // nicht mit Defaults überschreiben, bevor geladen wurde
    try {
      localStorage.setItem(
        EINSTELLUNGEN_KEY,
        JSON.stringify({
          modus,
          breite,
          hoehe,
          quer,
          formatId,
          zeigeName,
          zeigeHinweis,
          zeigeLogo,
          logoPos,
          schriftFaktor,
          blatt,
        }),
      );
    } catch {
      /* Speicher voll/gesperrt → ignorieren */
    }
  }, [
    geladen,
    modus,
    breite,
    hoehe,
    quer,
    formatId,
    zeigeName,
    zeigeHinweis,
    zeigeLogo,
    logoPos,
    schriftFaktor,
    blatt,
  ]);

  // Portal-Ziel steht erst nach dem Mount (kein document beim SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // „Weitere Karten auf die Seite" (nur A4): Maschinen-Suche + Zusatzkarten.
  const [weitere, setWeitere] = useState(false);
  const [msuche, setMsuche] = useState("");
  const [mtreffer, setMtreffer] = useState<{ id: string; name: string }[]>([]);
  const [mladen, setMladen] = useState(false);
  const [zusatz, setZusatz] = useState<Karte[]>([]);
  const [mfehler, setMfehler] = useState<string | null>(null);
  const suchNr = useRef(0);

  // Debounced Maschinen-Suche (Muster wie model-search): die laufende Nummer
  // verwirft veraltete Antworten.
  useEffect(() => {
    if (!weitere) return;
    const q = msuche.trim();
    const timer = setTimeout(() => {
      if (q.length < 1) {
        suchNr.current += 1;
        setMtreffer([]);
        return;
      }
      const nr = ++suchNr.current;
      setMladen(true);
      sucheMeineMaschinen(q)
        .then((r) => {
          if (nr === suchNr.current) setMtreffer(r);
        })
        .catch(() => {
          if (nr === suchNr.current) setMtreffer([]);
        })
        .finally(() => {
          if (nr === suchNr.current) setMladen(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [msuche, weitere]);

  async function karteHinzufuegen(id: string) {
    setMfehler(null);
    const res = await qrKarteFuerMaschine(id);
    if ("error" in res) {
      setMfehler(res.error);
      return;
    }
    setZusatz((alt) =>
      alt.some((k) => k.id === res.id) ? alt : [...alt, res],
    );
  }

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

  // Dynamisches Print-CSS. Der Druck-Inhalt hängt via Portal DIREKT am <body>
  // (#qr-print-root); im Druck wird alles ANDERE ausgeblendet und die Wurzel
  // im NORMALEN Fluss gezeigt — so paginiert der Browser die Kacheln über
  // mehrere A4-Seiten (mit `position: fixed` ginge das nicht). @page = A4 bei
  // A4-Modus, sonst exakte Kartengröße.
  const printCss = gueltig
    ? `@page { size: ${blatt === "a4" ? "A4" : `${breiteMm}mm ${hoeheMm}mm`}; margin: 0; }
@media print {
  html, body { background: #ffffff; }
  body > *:not(#qr-print-root) { display: none !important; }
  #qr-print-root { display: block !important; }
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
  // eingepasst (nie beschnitten). Nimmt Name + QR-SVG, damit dieselbe Karte
  // für die aktuelle Maschine UND jede Zusatzkarte gerendert werden kann; der
  // Look (Logo, Toggles, Format) gilt für alle gemeinsam.
  const kartenInhalt = (kName: string, kSvg: string) => (
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
          {kName}
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
          dangerouslySetInnerHTML={{ __html: kSvg }}
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

  // Schnittmarken (nur im A4-Modus): je Ecke ein waagerechter + ein senkrechter
  // Strich knapp außerhalb der Karte. Als BORDER gezeichnet (Vordergrund) statt
  // als background-Div — Browser drucken Hintergrundfarben oft NICHT, Ränder
  // aber immer.
  const MARKE_MM = 4;
  const STRICH = "0.3mm solid #000";
  const marke = (s: CSSProperties, key: string) => (
    <div key={key} style={{ position: "absolute", ...s }} />
  );
  const hStrich = (s: CSSProperties, key: string) =>
    marke({ ...s, width: `${MARKE_MM}mm`, borderTop: STRICH }, key);
  const vStrich = (s: CSSProperties, key: string) =>
    marke({ ...s, height: `${MARKE_MM}mm`, borderLeft: STRICH }, key);
  const schnittmarken = [
    hStrich({ left: `-${MARKE_MM}mm`, top: 0 }, "tl-h"),
    vStrich({ top: `-${MARKE_MM}mm`, left: 0 }, "tl-v"),
    hStrich({ right: `-${MARKE_MM}mm`, top: 0 }, "tr-h"),
    vStrich({ top: `-${MARKE_MM}mm`, right: 0 }, "tr-v"),
    hStrich({ left: `-${MARKE_MM}mm`, bottom: 0 }, "bl-h"),
    vStrich({ bottom: `-${MARKE_MM}mm`, left: 0 }, "bl-v"),
    hStrich({ right: `-${MARKE_MM}mm`, bottom: 0 }, "br-h"),
    vStrich({ bottom: `-${MARKE_MM}mm`, right: 0 }, "br-v"),
  ];

  // Die Karte inkl. Marken (A4) bzw. pur (exakt).
  const kartenBoxFuer = (kName: string, kSvg: string) =>
    blatt === "a4" ? (
      <div
        style={{
          position: "relative",
          width: `${breiteMm}mm`,
          height: `${hoeheMm}mm`,
        }}
      >
        {kartenInhalt(kName, kSvg)}
        {schnittmarken}
      </div>
    ) : (
      kartenInhalt(kName, kSvg)
    );

  // Alle zu druckenden Karten: die aktuelle Maschine + (nur A4) die Zusatzkarten.
  const zusatzAktiv = blatt === "a4" && weitere;
  const alleKarten: Karte[] = [
    { id: machineId, name, qrSvg },
    ...(zusatzAktiv ? zusatz : []),
  ];

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

        {/* Weitere Karten auf die A4-Seite (nur im A4-Modus). */}
        {blatt === "a4" ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={weitere}
                onChange={(e) => setWeitere(e.target.checked)}
              />
              Weitere Karten auf die Seite drucken
            </label>

            {weitere ? (
              <div className="max-w-md space-y-2">
                {/* Bereits hinzugefügte Zusatzkarten. */}
                {zusatz.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {zusatz.map((k) => (
                      <li
                        key={k.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-sm"
                      >
                        {k.name}
                        <button
                          type="button"
                          aria-label={`${k.name} entfernen`}
                          onClick={() =>
                            setZusatz((alt) => alt.filter((x) => x.id !== k.id))
                          }
                          className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Maschinen-Suche zum Hinzufügen. */}
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                  />
                  <Input
                    value={msuche}
                    onChange={(e) => setMsuche(e.target.value)}
                    placeholder="Maschine suchen (Name) …"
                    className="pl-9"
                  />
                  {mladen ? (
                    <Loader2
                      size={15}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-muted)]"
                    />
                  ) : null}
                </div>
                {mtreffer.filter(
                  (m) =>
                    m.id !== machineId && !zusatz.some((k) => k.id === m.id),
                ).length > 0 ? (
                  <ul className="max-h-56 divide-y divide-[var(--color-border)] overflow-y-auto rounded-[var(--radius)] border border-[var(--color-border)]">
                    {mtreffer
                      .filter(
                        (m) =>
                          m.id !== machineId &&
                          !zusatz.some((k) => k.id === m.id),
                      )
                      .map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => karteHinzufuegen(m.id)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-border)]/40"
                          >
                            <span className="min-w-0 truncate">{m.name}</span>
                            <Plus
                              size={15}
                              className="flex-none text-[var(--color-muted)]"
                            />
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : null}
                {mfehler ? (
                  <p className="text-sm text-[var(--color-danger)]">
                    {mfehler}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

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
                  {kartenBoxFuer(name, qrSvg)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-danger)]">
                Bitte gültige Maße angeben (mind. 10 mm).
              </p>
            )}
            {zusatzAktiv && zusatz.length > 0 ? (
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {alleKarten.length} Karten auf A4 (läuft bei Bedarf auf weitere
                Seiten über).
              </p>
            ) : null}
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

      {/* ── Druck-Wurzel via Portal DIREKT am <body> (auf dem Bildschirm per
             display:none versteckt; im Druck macht das Print-CSS sie sichtbar
             und blendet alles andere aus → paginiert im normalen Fluss).
             A4: Kacheln (inline-block, je Karte Schnittmarken, break-inside),
             Exakt: die eine Karte in Kartengröße = eine Seite. ────────────── */}
      {mounted && gueltig
        ? createPortal(
            <div id="qr-print-root" style={{ display: "none" }}>
              {blatt === "a4" ? (
                <div
                  style={{
                    width: "210mm",
                    boxSizing: "border-box",
                    padding: `${MARKE_MM + 2}mm`,
                    background: "#ffffff",
                  }}
                >
                  {alleKarten.map((k) => (
                    <div
                      key={k.id}
                      style={{
                        display: "inline-block",
                        verticalAlign: "top",
                        // Abstand ≥ 2× Markenlänge, damit sich die Marken
                        // benachbarter Karten nicht berühren.
                        margin: `${MARKE_MM + 2}mm`,
                        breakInside: "avoid",
                      }}
                    >
                      {kartenBoxFuer(k.name, k.qrSvg)}
                    </div>
                  ))}
                </div>
              ) : (
                kartenBoxFuer(name, qrSvg)
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
