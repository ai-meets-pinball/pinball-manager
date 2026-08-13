import { Bug, ImageIcon } from "lucide-react";
import { FeedbackBearbeiten, FeedbackForm } from "@/components/feedback-form";
import { Card } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { List, ListRow } from "@/components/ui/list";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteFeedback } from "@/db/actions/feedback";
import { getAllesFeedback, getMeinFeedback } from "@/db/queries";
import { isSuperAdmin, isSupporter, requireUser } from "@/lib/session";
import { FEEDBACK_STATUS } from "@/lib/validators";

/*
  Feedback & Fehlermeldungen — EINE Seite mit rollenabhängigen Abschnitten
  (bewusst nicht unter /admin, weil auch Supporter die Meldungen sehen sollen;
  Muster wie /kuratierung: der Guard steht lesbar hier):
  - alle Nutzer: Meldung absenden + „Meine Meldungen" (mit Status und Antwort),
  - Supporter + Super-Admins: „Alle Meldungen",
  - nur Super-Admins: Status/Antwort setzen, löschen.
*/

const TYP_LABEL: Record<string, string> = {
  fehler: "Fehler",
  verbesserung: "Verbesserungsvorschlag",
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; status?: string }>;
}) {
  const user = await requireUser();
  const { von, status } = await searchParams;
  const darfAlleSehen = isSupporter(user) || isSuperAdmin(user);
  const darfBearbeiten = isSuperAdmin(user);

  const meine = await getMeinFeedback(user.id);
  const alle = darfAlleSehen ? await getAllesFeedback(user) : [];

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
    if (von) p.set("von", von);
    if (key) p.set("status", key);
    const qs = p.toString();
    return `/feedback${qs ? `?${qs}` : ""}`;
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
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bug size={22} className="text-[var(--color-primary)]" />
          Feedback &amp; Fehlermeldungen
        </h1>
        <p className="text-[var(--color-muted)]">
          Etwas funktioniert nicht oder du hast eine Idee? Beschreib es kurz —
          du siehst hier auch den Stand deiner bisherigen Meldungen.
        </p>
      </div>

      <Card>
        <FeedbackForm von={von ?? ""} />
      </Card>

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
                  {TYP_LABEL[m.typ]} · {m.createdAt.toLocaleDateString("de-DE")}
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

      {darfAlleSehen ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Alle Meldungen ({alle.length})
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {darfBearbeiten
              ? "Status und Antwort sind für den Melder sichtbar."
              : "Nur-Lese-Ansicht — bearbeiten dürfen Super-Admins."}
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
                </div>
              </ListRow>
            ))}
          </List>
        </section>
      ) : null}
    </div>
  );
}
