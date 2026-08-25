import { List, ListRow } from "@/components/ui/list";
import { Pagination } from "@/components/ui/pagination";
import { getWhatsappProtokoll } from "@/db/queries/whatsapp";
import { whatsappVersandAktiv } from "@/lib/whatsapp/provider";

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
  searchParams: Promise<{ seite?: string }>;
}) {
  const sp = await searchParams;
  const seite = Math.max(1, Number(sp.seite) || 1);

  const { rows, gesamt } = await getWhatsappProtokoll({
    seite,
    proSeite: PRO_SEITE,
  });
  const pages = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  const aktiv = whatsappVersandAktiv();

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">WhatsApp-Protokoll ({gesamt})</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Jede WhatsApp-Benachrichtigung — wann, an welche Nummer, mit welchem
          Text.
        </p>
        {aktiv ? (
          <p className="text-xs text-[var(--color-success)]">
            Versand aktiv (WHATSAPP_PROVIDER=twilio, Twilio konfiguriert).
          </p>
        ) : (
          <p className="text-xs text-[var(--color-faint)]">
            Versand deaktiviert — die Einträge zeigen nur, was rausgehen würde
            (WHATSAPP_PROVIDER≠twilio oder Twilio nicht vollständig konfiguriert).
          </p>
        )}
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
                <span className="text-xs text-[var(--color-success)]">
                  gesendet
                </span>
              ) : (
                <span
                  className="text-xs text-[var(--color-danger)]"
                  title={r.fehler ?? undefined}
                >
                  Fehler
                </span>
              )
            }
          >
            {r.inhalt ? (
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

      <Pagination page={seite} pages={pages} basePath="/admin/whatsapp" params={{}} />
    </section>
  );
}
