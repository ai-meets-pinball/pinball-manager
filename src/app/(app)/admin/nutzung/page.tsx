import Link from "next/link";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { X } from "lucide-react";
import { RememberParams } from "@/components/remember-params";
import { Badge } from "@/components/ui/badge";
import { ChipFilter } from "@/components/ui/chip-filter";
import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { SortKopf } from "@/components/ui/sort-kopf";
import { ENUM_LABEL } from "@/components/ui/status-badge";
import { db } from "@/db";
import {
  AKTIVITAET_ARTEN,
  getAktivitaet,
  getNutzungClubs,
  getNutzungNutzer,
  type AktivitaetArt,
  type NutzerZeile,
} from "@/db/queries";
import { user } from "@/db/schema";
import { relativeZeit } from "@/lib/format";
import {
  ZEITRAEUME,
  ZEITRAUM_LABEL,
  zeitraumAb,
  zeitraumAusParam,
  type Zeitraum,
} from "@/lib/nutzung";
import { klebrig } from "@/lib/sticky-view";

/*
  Nutzungsübersicht (nur Super-Admins — Guard im admin/layout): Wer nutzt den
  Pinball Manager wie? Drei Reiter — je Nutzer, je Club, Ereignis-Feed —
  mit gemeinsamem Zeitraum. Reiter und Zeitraum kleben (Cookie), Filter und
  Sortierung liegen in der URL. Die Zahlen kommen aus db/queries/nutzung.ts.
*/
const PRO_SEITE = 50;
const TABS = [
  { key: "nutzer", label: "Nutzer" },
  { key: "clubs", label: "Clubs" },
  { key: "aktivitaet", label: "Aktivität" },
] as const;
type Tab = (typeof TABS)[number]["key"];
const SORTIERUNGEN = ["gesehen", "name", "tage", "logins", "maschinen"] as const;
type Sortierung = (typeof SORTIERUNGEN)[number];

const ZELLE = "py-2 pr-4 align-middle";
const ZAHL = "py-2 pr-4 text-right tabular-nums align-middle";

export default async function NutzungPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    zeitraum?: string;
    nutzer?: string;
    art?: string;
    seite?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const sp = await searchParams;
  const keks = await cookies();
  const tab = klebrig(
    sp.tab,
    keks.get("nutzungTab")?.value,
    (v) => TABS.some((t) => t.key === v),
    "nutzer",
  ) as Tab;
  const zeitraum = zeitraumAusParam(
    klebrig(sp.zeitraum, keks.get("nutzungZeitraum")?.value, (v) =>
      (ZEITRAEUME as readonly string[]).includes(v), "30"),
  );
  const grenze = zeitraumAb(zeitraum);
  const seite = Math.max(1, Number(sp.seite) || 1);
  const sort = (SORTIERUNGEN as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as Sortierung)
    : "gesehen";
  const dir: "auf" | "ab" = sp.dir === "auf" ? "auf" : "ab";
  const nutzerFilter = sp.nutzer || undefined;
  const artFilter = sp.art && sp.art in AKTIVITAET_ARTEN ? sp.art : undefined;

  // Links tragen Reiter und Zeitraum immer mit (klebrig), den Rest nur bei Bedarf.
  const link = (p: Partial<Record<string, string | undefined>>) => {
    const q = new URLSearchParams();
    q.set("tab", p.tab ?? tab);
    q.set("zeitraum", p.zeitraum ?? zeitraum);
    for (const k of ["nutzer", "art", "sort", "dir", "seite"] as const) {
      const v = k in p ? p[k] : undefined;
      if (v) q.set(k, v);
    }
    return `/admin/nutzung?${q.toString()}`;
  };

  const zeitraumChips = ZEITRAEUME.map((z) => ({
    key: z,
    label: ZEITRAUM_LABEL[z as Zeitraum],
    href: link({ zeitraum: z, nutzer: nutzerFilter, art: artFilter }),
    aktiv: zeitraum === z,
  }));

  return (
    <section className="space-y-4">
      <RememberParams
        path="/admin/nutzung"
        params={{ nutzungTab: tab, nutzungZeitraum: zeitraum }}
      />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Nutzung</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Wer nutzt den Pinball Manager wie — je Nutzer, je Club und als
          Ereignis-Feed. Zähler gelten für den gewählten Zeitraum; Maschinen
          und Mitglieder sind Bestand.
        </p>
      </div>

      <nav
        aria-label="Sichten"
        className="flex flex-wrap gap-1 border-b border-[var(--color-border)]"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={link({ tab: t.key })}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.key
                ? "border-[var(--color-primary)] font-medium text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <ChipFilter label="Zeitraum:" ariaLabel="Zeitraum wählen" options={zeitraumChips} />

      {tab === "nutzer" ? (
        <NutzerTabelle
          zeilen={sortiert(await getNutzungNutzer(grenze), sort, dir)}
          sort={sort}
          dir={dir}
          sortHref={(s) =>
            link({ sort: s, dir: s === sort ? (dir === "ab" ? "auf" : "ab") : "ab" })
          }
          aktivitaetHref={(id) => link({ tab: "aktivitaet", nutzer: id })}
        />
      ) : null}

      {tab === "clubs" ? <ClubTabelle zeilen={await getNutzungClubs(grenze)} /> : null}

      {tab === "aktivitaet" ? (
        <Aktivitaet
          grenze={grenze}
          nutzerId={nutzerFilter}
          art={artFilter}
          seite={seite}
          link={link}
        />
      ) : null}
    </section>
  );
}

/* ── Nutzer ────────────────────────────────────────────────────────────────── */

function sortiert(zeilen: NutzerZeile[], sort: Sortierung, dir: "auf" | "ab") {
  const f = dir === "auf" ? 1 : -1;
  const wert = (z: NutzerZeile) =>
    sort === "gesehen"
      ? (z.zuletztGesehen?.getTime() ?? 0)
      : sort === "tage"
        ? z.aktiveTage
        : sort === "logins"
          ? z.logins
          : z.maschinen;
  return [...zeilen].sort((a, b) =>
    sort === "name"
      ? f * a.name.localeCompare(b.name, "de")
      : f * (wert(a) - wert(b)) || a.name.localeCompare(b.name, "de"),
  );
}

function NutzerTabelle({
  zeilen,
  sort,
  dir,
  sortHref,
  aktivitaetHref,
}: {
  zeilen: NutzerZeile[];
  sort: Sortierung;
  dir: "auf" | "ab";
  sortHref: (s: Sortierung) => string;
  aktivitaetHref: (id: string) => string;
}) {
  const kopf = (label: string, s: Sortierung, rechts = false) => (
    <SortKopf
      label={label}
      aktiv={sort === s}
      dir={dir}
      href={sortHref(s)}
      className={rechts ? "py-2 pr-4 text-right font-medium" : "py-2 pr-4 font-medium"}
    />
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
            {kopf("Nutzer", "name")}
            <th className="py-2 pr-4 font-medium">Clubs</th>
            {kopf("Maschinen", "maschinen", true)}
            <th className={`${ZAHL} font-medium`}>Fehler</th>
            <th className={`${ZAHL} font-medium`}>Reparaturen</th>
            <th className={`${ZAHL} font-medium`}>Wissen</th>
            <th className={`${ZAHL} font-medium`}>Feedback</th>
            <th className={`${ZAHL} font-medium`}>KI</th>
            {kopf("Logins", "logins", true)}
            {kopf("Aktive Tage", "tage", true)}
            {kopf("Zuletzt gesehen", "gesehen")}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr
              key={z.id}
              className="border-b border-[var(--color-border)] align-middle hover:bg-[var(--color-surface-2)]"
            >
              <td className={ZELLE}>
                <Link href={aktivitaetHref(z.id)} className="font-medium hover:underline">
                  {z.name}
                </Link>
                <div className="text-xs text-[var(--color-muted)]">{z.email}</div>
                {z.globaleRollen.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {z.globaleRollen.map((r) => (
                      <Badge key={r} tone="accent">
                        {ENUM_LABEL[r] ?? r}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </td>
              <td className={`${ZELLE} text-[var(--color-muted)]`}>
                {z.clubs.length === 0
                  ? "—"
                  : z.clubs.map((c) => (
                      <div key={`${c.name}-${c.rolle}`} className="whitespace-nowrap">
                        {c.name}{" "}
                        <span className="text-xs">({ENUM_LABEL[c.rolle] ?? c.rolle})</span>
                      </div>
                    ))}
              </td>
              <td className={ZAHL}>{z.maschinen}</td>
              <td className={ZAHL}>{z.fehler}</td>
              <td className={ZAHL}>{z.reparaturen}</td>
              <td className={ZAHL}>{z.wissen}</td>
              <td className={ZAHL}>{z.feedback}</td>
              <td className={ZAHL}>{z.kiAufrufe}</td>
              <td className={ZAHL}>{z.logins}</td>
              <td className={ZAHL}>{z.aktiveTage}</td>
              <td className={`${ZELLE} whitespace-nowrap text-[var(--color-muted)]`}>
                {z.zuletztGesehen ? (
                  <span title={z.zuletztGesehen.toLocaleString("de-DE")}>
                    {relativeZeit(z.zuletztGesehen)}
                  </span>
                ) : (
                  "nie"
                )}
                <div className="text-xs text-[var(--color-faint)]">
                  dabei seit {z.erstelltAm.toLocaleDateString("de-DE")}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Clubs ─────────────────────────────────────────────────────────────────── */

function ClubTabelle({
  zeilen,
}: {
  zeilen: Awaited<ReturnType<typeof getNutzungClubs>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
            <th className="py-2 pr-4 font-medium">Club</th>
            <th className={`${ZAHL} font-medium`}>Mitglieder</th>
            <th className={`${ZAHL} font-medium`}>Maschinen</th>
            <th className={`${ZAHL} font-medium`}>Fehler</th>
            <th className={`${ZAHL} font-medium`}>Reparaturen</th>
            <th className="py-2 font-medium">Letzte Aktivität</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-[var(--color-muted)]">
                Noch keine Clubs.
              </td>
            </tr>
          ) : null}
          {zeilen.map((c) => (
            <tr
              key={c.id}
              className="border-b border-[var(--color-border)] align-middle hover:bg-[var(--color-surface-2)]"
            >
              <td className={ZELLE}>
                <Link href={`/clubs/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className={ZAHL}>{c.mitglieder}</td>
              <td className={ZAHL}>{c.maschinen}</td>
              <td className={ZAHL}>{c.fehler}</td>
              <td className={ZAHL}>{c.reparaturen}</td>
              <td className="py-2 whitespace-nowrap text-[var(--color-muted)]">
                {c.letzteAktivitaet ? (
                  <span title={c.letzteAktivitaet.toLocaleString("de-DE")}>
                    {relativeZeit(c.letzteAktivitaet)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Aktivität ─────────────────────────────────────────────────────────────── */

async function Aktivitaet({
  grenze,
  nutzerId,
  art,
  seite,
  link,
}: {
  grenze: Date | null;
  nutzerId?: string;
  art?: string;
  seite: number;
  link: (p: Partial<Record<string, string | undefined>>) => string;
}) {
  const { rows, gesamt, arten } = await getAktivitaet({
    grenze,
    userId: nutzerId,
    art,
    seite,
    proSeite: PRO_SEITE,
  });
  const pages = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  const gefilterterNutzer = nutzerId
    ? await db.query.user.findFirst({
        where: eq(user.id, nutzerId),
        columns: { name: true },
      })
    : null;

  const artChips = [
    {
      key: "",
      label: "Alle",
      count: arten.reduce((s, a) => s + a.n, 0),
      href: link({ nutzer: nutzerId }),
      aktiv: !art,
    },
    ...(Object.keys(AKTIVITAET_ARTEN) as AktivitaetArt[])
      .map((k) => ({ k, n: arten.find((a) => a.art === k)?.n ?? 0 }))
      .filter((x) => x.n > 0)
      .map((x) => ({
        key: x.k,
        label: AKTIVITAET_ARTEN[x.k],
        count: x.n,
        href: link({ nutzer: nutzerId, art: x.k }),
        aktiv: art === x.k,
      })),
  ];

  return (
    <div className="space-y-3">
      <ChipFilter label="Art:" ariaLabel="Nach Ereignisart filtern" options={artChips} />
      {nutzerId ? (
        <p className="text-sm text-[var(--color-muted)]">
          Nur Nutzer <strong>{gefilterterNutzer?.name ?? "unbekannt"}</strong>{" "}
          <Link
            href={link({ art })}
            className="inline-flex items-center gap-1 underline hover:text-[var(--color-fg)]"
          >
            <X size={12} /> Filter aufheben
          </Link>
        </p>
      ) : null}

      <List empty="Keine Ereignisse im Zeitraum." kompakt>
        {rows.map((e, i) => (
          <ListRow
            key={`${e.art}-${e.zeit.getTime()}-${i}`}
            kompakt
            titleWrap
            href={e.href ?? undefined}
            title={e.detail || AKTIVITAET_ARTEN[e.art]}
            subtitle={
              <>
                {e.nutzer ?? "—"} · {e.zeit.toLocaleString("de-DE")}
              </>
            }
            meta={<Badge tone="muted">{AKTIVITAET_ARTEN[e.art]}</Badge>}
          />
        ))}
      </List>

      <Pagination
        page={seite}
        pages={pages}
        basePath="/admin/nutzung"
        params={{
          tab: "aktivitaet",
          ...(nutzerId ? { nutzer: nutzerId } : {}),
          ...(art ? { art } : {}),
        }}
      />
    </div>
  );
}
