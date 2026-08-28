import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Bug, ImageIcon } from "lucide-react";
import { FeedbackBearbeiten, FeedbackForm } from "@/components/feedback-form";
import { Card } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteFeedback } from "@/db/actions/feedback";
import {
  getAllesFeedback,
  getFeedbackMailLog,
  getMeinFeedback,
} from "@/db/queries";
import { mailKategorieLabel } from "@/lib/mail-kategorie";
import { isSuperAdmin, requireUser } from "@/lib/session";
import { FEEDBACK_STATUS } from "@/lib/validators";

/*
  Feedback & Fehlermeldungen — EINE Seite mit rollenabhängigen Abschnitten
  (bewusst nicht unter /admin, damit jeder angemeldete Nutzer melden kann;
  Muster wie /kuratierung: der Guard steht lesbar hier):
  - alle Nutzer: Meldung absenden + „Meine Meldungen" (mit Status und Antwort),
  - nur Super-Admins: „Alle Meldungen" + Status/Antwort setzen, löschen.
*/

const TYP_LABEL: Record<string, string> = {
  fehler: "Fehler",
  verbesserung: "Verbesserungsvorschlag",
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; status?: string; tab?: string }>;
}) {
  const user = await requireUser();
  const { von, status, tab: tabParam } = await searchParams;
  // Alle Meldungen sehen und bearbeiten fallen zusammen: nur Super-Admins.
  const darfAlleSehen = isSuperAdmin(user);
  const darfBearbeiten = isSuperAdmin(user);

  const meine = await getMeinFeedback(user.id);
  const alle = darfAlleSehen ? await getAllesFeedback(user) : [];

  // Drei Reiter (Zustand in der URL): Neue Meldung (Standard) · Meine Meldungen ·
  // Alle Meldungen (nur Super-Admin). Ungültige/gesperrte Werte → „neu".
  const tab =
    tabParam === "meine" || (tabParam === "alle" && darfAlleSehen)
      ? tabParam
      : "neu";
  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (key !== "neu") p.set("tab", key);
    if (von) p.set("von", von); // Herkunft für das Formular erhalten
    const qs = p.toString();
    return `/feedback${qs ? `?${qs}` : ""}`;
  };
  const tabs = [
    { key: "neu", label: "Neue Meldung", count: null as number | null },
    { key: "meine", label: "Meine Meldungen", count: meine.length },
    ...(darfAlleSehen
      ? [{ key: "alle", label: "Alle Meldungen", count: alle.length }]
      : []),
  ];

  // Versand-Protokoll je Meldung (wann, an wen, welcher Text) für die Triage.
  const mailRows = darfAlleSehen
    ? await getFeedbackMailLog(alle.map((m) => m.id))
    : [];
  const mailsProFeedback = new Map<string, typeof mailRows>();
  for (const r of mailRows) {
    if (!r.feedbackId) continue;
    const arr = mailsProFeedback.get(r.feedbackId) ?? [];
    arr.push(r);
    mailsProFeedback.set(r.feedbackId, arr);
  }

  // Status-Filter der Triage-Liste (Einfachauswahl wie die Club-Auswahl auf
  // /machines): Zustand in der URL, gefiltert wird in-memory (kleine Liste).
  const proStatus = new Map<string, number>();
  for (const m of alle)
    proStatus.set(m.status, (proStatus.get(m.status) ?? 0) + 1);
  const statusFilter = (FEEDBACK_STATUS as readonly string[]).includes(
    status ?? "",
  )
    ? status!
    : "";
  const gefiltert = statusFilter
    ? alle.filter((m) => m.status === statusFilter)
    : alle;
  const statusHref = (key: string) => {
    const p = new URLSearchParams();
    p.set("tab", "alle");
    if (von) p.set("von", von);
    if (key) p.set("status", key);
    return `/feedback?${p.toString()}`;
  };
  const statusOptionen = [
    {
      key: "",
      label: "Alle",
      count: alle.length,
      href: statusHref(""),
      aktiv: statusFilter === "",
    },
    ...FEEDBACK_STATUS.map((s) => ({
      key: s,
      label: s,
      count: proStatus.get(s) ?? 0,
      href: statusHref(s),
      aktiv: statusFilter === s,
    })),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Bug size={22} className="text-[var(--color-primary)]" />
            Feedback &amp; Fehlermeldungen
          </span>
        }
        description="Etwas funktioniert nicht oder du hast eine Idee? Beschreib es kurz — du siehst hier auch den Stand deiner bisherigen Meldungen."
      />

      <nav
        aria-label="Bereiche"
        className="flex flex-wrap gap-1 border-b border-[var(--color-border)]"
      >
        {tabs.map((t) => {
          const aktiv = tab === t.key;
          return (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              aria-current={aktiv ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                aktiv
                  ? "border-[var(--color-primary)] font-medium text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {t.label}
              {t.count != null ? (
                <span className="ml-1 text-xs text-[var(--color-faint)]">
                  {t.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "neu" ? (
        <Card>
          <FeedbackForm von={von ?? ""} />
        </Card>
      ) : null}

      {tab === "meine" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Meine Meldungen ({meine.length})
          </h2>
          <List empty="Noch keine Meldungen.">
            {meine.map((m) => (
              <ListRow
                key={m.id}
                title={m.titel}
                subtitle={
                  <>
                    {TYP_LABEL[m.typ]} ·{" "}
                    {m.createdAt.toLocaleDateString("de-DE")}
                    {m.antwort ? <> — Antwort: {m.antwort}</> : null}
                  </>
                }
                meta={
                  <>
                    {m.screenshotUrl ? (
                      <a
                        href={m.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Screenshot ansehen"
                        className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                      >
                        <ImageIcon size={15} />
                      </a>
                    ) : null}
                    <StatusBadge value={m.status} />
                  </>
                }
              />
            ))}
          </List>
        </section>
      ) : null}

      {tab === "alle" && darfAlleSehen ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Alle Meldungen ({alle.length})
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Status und Antwort sind für den Melder sichtbar.
          </p>
          <ChipFilter
            label="Status:"
            ariaLabel="Nach Status filtern"
            options={statusOptionen}
          />
          <List empty="Keine Meldungen mit diesem Status.">
            {gefiltert.map((m) => (
              <ListRow
                key={m.id}
                title={m.titel}
                subtitle={
                  <>
                    {TYP_LABEL[m.typ]} · von {m.melderName ?? m.melderEmail} ·{" "}
                    {m.createdAt.toLocaleDateString("de-DE")}
                    {m.seite ? <> · Seite {m.seite}</> : null}
                    {m.appVersion ? <> · v{m.appVersion}</> : null}
                  </>
                }
                meta={
                  <>
                    {m.screenshotUrl ? (
                      <a
                        href={m.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Screenshot ansehen"
                        className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                      >
                        <ImageIcon size={15} />
                      </a>
                    ) : null}
                    <StatusBadge value={m.status} />
                    {darfBearbeiten ? (
                      <form action={deleteFeedback}>
                        <input type="hidden" name="id" value={m.id} />
                        <ConfirmButton
                          question="Meldung wirklich löschen?"
                          confirmLabel="Ja, löschen"
                        >
                          Löschen
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </>
                }
              >
                <div className="space-y-2">
                  <p className="whitespace-pre-line break-words text-sm text-[var(--color-muted)]">
                    {m.beschreibung}
                  </p>
                  {m.userAgent ? (
                    <p className="font-mono text-[10px] text-[var(--color-faint)]">
                      {m.userAgent}
                    </p>
                  ) : null}
                  {darfBearbeiten ? (
                    <FeedbackBearbeiten
                      id={m.id}
                      status={m.status}
                      antwort={m.antwort}
                    />
                  ) : m.antwort ? (
                    <p className="text-sm">Antwort: {m.antwort}</p>
                  ) : null}

                  {(mailsProFeedback.get(m.id)?.length ?? 0) > 0 ? (
                    <div className="space-y-1 border-t border-[var(--color-border)] pt-2">
                      <p className="text-xs font-medium text-[var(--color-muted)]">
                        Versand-Protokoll
                      </p>
                      {mailsProFeedback.get(m.id)!.map((r) => (
                        <p
                          key={r.id}
                          className="text-xs text-[var(--color-muted)]"
                        >
                          {r.gesendetAm.toLocaleString("de-DE")} ·{" "}
                          {mailKategorieLabel(r.kategorie)} · an {r.empfaenger}
                          {r.erfolg ? "" : " · FEHLER"}
                          {r.inhalt ? <> — {r.inhalt}</> : null}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </ListRow>
            ))}
          </List>
        </section>
      ) : null}
    </div>
  );
}
