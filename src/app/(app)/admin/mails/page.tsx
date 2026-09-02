import { ChipFilter } from "@/components/ui/chip-filter";
import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { getMailProtokoll } from "@/db/queries";
import { mailKategorieLabel } from "@/lib/mail-kategorie";
import { AlignLeft, Rows3 } from "lucide-react";
import { cookies } from "next/headers";
import { RememberParams } from "@/components/remember-params";
import { Badge } from "@/components/ui/badge";
import { ViewToggle } from "@/components/ui/view-toggle";
import { klebrig } from "@/lib/sticky-view";

/*
  Versand-Protokoll aller System-Mails (mail_log): wann, an wen, welcher Text,
  Erfolg/Fehler. Nur Super-Admins (Guard im admin/layout). Neueste zuerst,
  Kategorie-Filter über dieselben Chips wie sonst, seitenweise.
*/
const PRO_SEITE = 50;

export default async function MailProtokollPage({
  searchParams,
}: {
  searchParams: Promise<{ kategorie?: string; seite?: string; ansicht?: string }>;
}) {
  const sp = await searchParams;
  const seite = Math.max(1, Number(sp.seite) || 1);
  // Kompakt (nur Kopfzeile) oder voll (mit Text) — URL gewinnt, sonst Cookie.
  const ansicht = klebrig(
    sp.ansicht,
    (await cookies()).get("mailsView")?.value,
    (v) => v === "kompakt" || v === "voll",
    "kompakt",
  ) as "kompakt" | "voll";
  const kategorie = sp.kategorie || undefined;

  const { rows, gesamt, kategorien, gesamtAlle } = await getMailProtokoll({
    kategorie,
    seite,
    proSeite: PRO_SEITE,
  });
  const pages = Math.max(1, Math.ceil(gesamt / PRO_SEITE));

  const href = (k: string) =>
    `/admin/mails?ansicht=${ansicht}${k ? `&kategorie=${encodeURIComponent(k)}` : ""}`;
  const ansichtHref = (a: "kompakt" | "voll") =>
    `/admin/mails?ansicht=${a}${kategorie ? `&kategorie=${encodeURIComponent(kategorie)}` : ""}`;
  const optionen = [
    {
      key: "",
      label: "Alle",
      count: gesamtAlle,
      href: href(""),
      aktiv: !kategorie,
    },
    ...kategorien.map((k) => ({
      key: k.kategorie,
      label: mailKategorieLabel(k.kategorie),
      count: k.n,
      href: href(k.kategorie),
      aktiv: kategorie === k.kategorie,
    })),
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Versand-Protokoll ({gesamt})</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Jede versendete System-Mail — wann, an wen, mit welchem Text.
        </p>
      </div>
      <RememberParams path="/admin/mails" params={{ mailsView: ansicht, ansicht }} />
      <ViewToggle
        options={[
          {
            href: ansichtHref("kompakt"),
            label: "Kompakt (nur Kopfzeilen)",
            icon: <Rows3 size={16} />,
            active: ansicht === "kompakt",
          },
          {
            href: ansichtHref("voll"),
            label: "Voll (mit Text)",
            icon: <AlignLeft size={16} />,
            active: ansicht === "voll",
          },
        ]}
      />
      </div>

      <ChipFilter
        label="Kategorie:"
        ariaLabel="Nach Kategorie filtern"
        options={optionen}
      />

      <List empty="Noch keine Mails protokolliert." kompakt>
        {rows.map((r) => (
          <ListRow
            key={r.id}
            kompakt
            title={r.betreff}
            subtitle={
              <>
                An {r.empfaenger} · {r.gesendetAm.toLocaleString("de-DE")}
              </>
            }
            meta={
              <>
                <Badge tone="muted">{mailKategorieLabel(r.kategorie)}</Badge>
                {r.erfolg ? (
                  <Badge tone="success">gesendet</Badge>
                ) : (
                  <Badge tone="danger">Fehler</Badge>
                )}
              </>
            }
          >
            {ansicht === "voll" && r.inhalt ? (
              <p className="whitespace-pre-line break-words text-sm text-[var(--color-muted)]">
                {r.inhalt}
              </p>
            ) : null}
            {!r.erfolg && r.fehler ? (
              <p className="text-xs text-[var(--color-danger)]">{r.fehler}</p>
            ) : null}
          </ListRow>
        ))}
      </List>

      <Pagination
        page={seite}
        pages={pages}
        basePath="/admin/mails"
        params={kategorie ? { kategorie } : {}}
      />
    </section>
  );
}
