import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { getWhatsappProtokoll } from "@/db/queries/whatsapp";
import { whatsappVersandAktiv } from "@/lib/whatsapp/provider";
import { AlignLeft, Rows3 } from "lucide-react";
import { cookies } from "next/headers";
import { RememberParams } from "@/components/remember-params";
import { Badge } from "@/components/ui/badge";
import { ViewToggle } from "@/components/ui/view-toggle";
import { klebrig } from "@/lib/sticky-view";

/*
  Versand-Protokoll aller WhatsApp-Benachrichtigungen (whatsapp_log): wann, an
  welche Nummer, welcher Text, Erfolg/Fehler. Nur Super-Admins (Guard im
  admin/layout). Neueste zuerst, seitenweise. Zeigt oben, ob der echte Versand
  aktiv ist — ist er es nicht, dokumentieren die Zeilen nur, was rausginge.
*/
const PRO_SEITE = 50;

export default async function WhatsappProtokollPage({
  searchParams,
}: {
  searchParams: Promise<{ seite?: string; ansicht?: string }>;
}) {
  const sp = await searchParams;
  const seite = Math.max(1, Number(sp.seite) || 1);
  // Kompakt (nur Kopfzeile) oder voll (mit Text) — URL gewinnt, sonst Cookie.
  const ansicht = klebrig(
    sp.ansicht,
    (await cookies()).get("whatsappView")?.value,
    (v) => v === "kompakt" || v === "voll",
    "kompakt",
  ) as "kompakt" | "voll";

  const { rows, gesamt } = await getWhatsappProtokoll({
    seite,
    proSeite: PRO_SEITE,
  });
  const pages = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  const aktiv = whatsappVersandAktiv();
  const ansichtHref = (a: "kompakt" | "voll") => `/admin/whatsapp?ansicht=${a}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">WhatsApp-Protokoll ({gesamt})</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Jede WhatsApp-Benachrichtigung — wann, an welche Nummer, mit welchem
          Text.
        </p>
        {aktiv ? (
          <p
            className="text-xs text-[var(--color-success)]"
            title="WHATSAPP_PROVIDER=twilio und Twilio-Zugangsdaten gesetzt"
          >
            Versand aktiv (Twilio).
          </p>
        ) : (
          <p
            className="text-xs text-[var(--color-faint)]"
            title="WHATSAPP_PROVIDER ist nicht „twilio“ oder die Twilio-Zugangsdaten fehlen"
          >
            Versand deaktiviert — Twilio ist nicht konfiguriert; die Einträge
            zeigen nur, was rausgehen würde.
          </p>
        )}
      </div>
      <RememberParams path="/admin/whatsapp" params={{ whatsappView: ansicht }} />
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

      <List empty="Noch keine WhatsApp-Nachrichten protokolliert." kompakt>
        {rows.map((r) => (
          <ListRow
            key={r.id}
            kompakt
            title={r.anlass}
            subtitle={
              <>
                An {r.empfaenger} · {r.gesendetAm.toLocaleString("de-DE")}
              </>
            }
            meta={
              r.erfolg ? (
                  <Badge tone="success">gesendet</Badge>
                ) : (
                  <Badge tone="danger">Fehler</Badge>
                )
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

      <Pagination page={seite} pages={pages} basePath="/admin/whatsapp" params={{ ansicht }} />
    </section>
  );
}
