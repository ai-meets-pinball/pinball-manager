import { config } from "dotenv";

/*
  Feedback-Triage direkt aus dem Repo (via `npm run feedback -- <befehl>`).
  Schreibt Status in DIESELBE DB wie die App und benachrichtigt den Melder bei
  Abschluss — über denselben Kern wie das Web-Triage (src/db/feedback-core.ts).

  Befehle:
    list [--alle] [--status=<s>]   offene (oder alle) Meldungen
    zeig <id>                      Volldetail einer Meldung
    annehmen <id> [--antwort "…"]  → „in Arbeit" (kein Mail)
    erledigt <id> [--antwort "…"]  → „erledigt"       (+ Mail an Melder)
    zurueckstellen <id> […]        → „zurückgestellt" (+ Mail)
    verwerfen <id> […]             → „verworfen"       (+ Mail)

  <id> ist ein eindeutiger uuid-Präfix (≥ 4 Zeichen, aus `list`).
  ACHTUNG: wirkt auf die DB, auf die DATABASE_URL/POSTGRES_URL zeigt (i. d. R.
  Produktion). Nur SELECT/UPDATE, kein Löschen.
*/

// .env.local zuerst laden (der DB-Code liest die Verbindungs-URL beim Import).
// Der DB-Import passiert DYNAMISCH in main() — erst NACH dem Laden und nach dem
// DB-freien help-Pfad, und ohne Top-Level-await (das Skript läuft als CommonJS).
config({ path: [".env.local", ".env"] });

const AKTIONEN: Record<
  string,
  "in Arbeit" | "erledigt" | "zurückgestellt" | "verworfen"
> = {
  annehmen: "in Arbeit",
  erledigt: "erledigt",
  zurueckstellen: "zurückgestellt",
  verwerfen: "verworfen",
};

function fehlerAus(msg: string): never {
  console.error(`Fehler: ${msg}`);
  process.exit(1);
}

/** --antwort "…" , --alle , --status=… und die erste Positional (id). */
function parseArgs(args: string[]): {
  positional?: string;
  antwort?: string;
  alle: boolean;
  status?: string;
} {
  const out: {
    positional?: string;
    antwort?: string;
    alle: boolean;
    status?: string;
  } = { alle: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--antwort") out.antwort = args[++i] ?? "";
    else if (a === "--alle") out.alle = true;
    else if (a.startsWith("--status="))
      out.status = a.slice("--status=".length);
    else if (!a.startsWith("--") && out.positional === undefined)
      out.positional = a;
  }
  return out;
}

function datum(d: Date): string {
  return new Date(d).toLocaleDateString("de-DE");
}

function kuerzen(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function usage(): void {
  console.log(
    [
      "npm run feedback -- <befehl>",
      "",
      "  list [--alle] [--status=<s>]       offene (oder alle) Meldungen",
      "  zeig <id>                          Volldetail",
      "  annehmen <id> [--antwort …]        → in Arbeit (kein Mail)",
      "  erledigt <id> [--antwort …]        → erledigt        (+ Mail)",
      "  zurueckstellen <id> [--antwort …]  → zurückgestellt  (+ Mail)",
      "  verwerfen <id> [--antwort …]       → verworfen        (+ Mail)",
    ].join("\n"),
  );
}

async function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!befehl || befehl === "help" || befehl === "--help") {
    usage();
    return;
  }

  // DB-Kern erst hier laden (env ist gesetzt, help ist schon abgehandelt).
  const { listeFeedback, findeFeedbackPraefix, setzeFeedbackStatus } =
    await import("@/db/feedback-core");

  async function idAusPraefix(): Promise<{ id: string; titel: string }> {
    const praefix = args.positional;
    if (!praefix || praefix.length < 4) {
      fehlerAus(
        "Bitte einen id-Präfix mit ≥ 4 Zeichen angeben (siehe `list`).",
      );
    }
    const treffer = await findeFeedbackPraefix(praefix!);
    if (treffer.length === 0)
      fehlerAus(`Keine Meldung mit Präfix „${praefix}".`);
    if (treffer.length > 1) {
      fehlerAus(
        `Präfix „${praefix}" ist mehrdeutig (${treffer.length} Treffer) — länger angeben.`,
      );
    }
    return treffer[0];
  }

  if (befehl === "list") {
    const rows = await listeFeedback({
      alle: args.alle,
      status: args.status as never,
    });
    if (rows.length === 0) {
      console.log("Keine Meldungen.");
      return;
    }
    console.log(`${rows.length} Meldung(en):\n`);
    for (const r of rows) {
      const kopf = `${r.id.slice(0, 8)}  ${r.typ.padEnd(12)}  ${String(r.status).padEnd(14)}`;
      const meta = `${r.melderName ?? r.melderEmail} · ${datum(r.createdAt)}${
        r.seite ? ` · ${r.seite}` : ""
      }`;
      console.log(`${kopf}  ${kuerzen(r.titel, 48)}`);
      console.log(`          ${meta}`);
    }
    return;
  }

  if (befehl === "zeig") {
    const { id } = await idAusPraefix();
    const [r] = (await listeFeedback({ alle: true })).filter(
      (x) => x.id === id,
    );
    if (!r) fehlerAus("Meldung nicht gefunden.");
    console.log(
      [
        `id:          ${r.id}`,
        `Typ:         ${r.typ}`,
        `Status:      ${r.status}`,
        `Titel:       ${r.titel}`,
        `Melder:      ${r.melderName ?? "?"} <${r.melderEmail}>`,
        `Datum:       ${datum(r.createdAt)}`,
        `Seite:       ${r.seite ?? "—"}`,
        `App-Version: ${r.appVersion ?? "—"}`,
        `Browser:     ${r.userAgent ?? "—"}`,
        `Screenshot:  ${r.screenshotUrl ?? "—"}`,
        `Antwort:     ${r.antwort ?? "—"}`,
        "",
        "Beschreibung:",
        r.beschreibung,
      ].join("\n"),
    );
    return;
  }

  const zielStatus = AKTIONEN[befehl];
  if (!zielStatus) {
    usage();
    fehlerAus(`Unbekannter Befehl: ${befehl}`);
  }

  const { id, titel } = await idAusPraefix();
  const res = await setzeFeedbackStatus({
    id,
    status: zielStatus,
    antwort: args.antwort, // undefined = Antwort unverändert lassen
  });
  console.log(
    `„${titel}": ${res.vorher} → ${res.nachher}` +
      (res.benachrichtigt ? " · Melder benachrichtigt" : ""),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
