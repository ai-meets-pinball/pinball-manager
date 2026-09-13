import Link from "next/link";
import { HandbuchDownload, HilfeSektionen } from "@/components/help-sections";
import { HelpTabs } from "@/components/help-tabs";
import { EINSTIEG, ZIELGRUPPEN, type Zielgruppe } from "@/lib/help-content";
import { getCurrentUser, isSuperAdmin, kannKuratieren } from "@/lib/session";

/*
  Einstiegs-Leitfaden (/help/einstieg): öffentlich wie die Anleitung. Erst das
  Allgemeine, dann genau EIN Weg je Zielgruppe (Wahl per ?ich=…, serverseitig
  gerendert — kein Client-State nötig), dann für alle: die KI ehrlich erklärt,
  „Tiefer einsteigen" und Feedback. Inhalt aus lib/help-content.ts (EINSTIEG),
  Darstellung aus components/help-sections.tsx — wie die übrige Hilfe.
*/
export default async function EinstiegPage({
  searchParams,
}: {
  searchParams: Promise<{ ich?: string }>;
}) {
  const [user, { ich }] = await Promise.all([getCurrentUser(), searchParams]);
  const gewaehlt: Zielgruppe = ZIELGRUPPEN.some((z) => z.key === ich)
    ? (ich as Zielgruppe)
    : "sammler";

  const allgemein = EINSTIEG.filter((s) => !s.zielgruppe && s.key === "einstieg-worum");
  const zielgruppe = EINSTIEG.filter((s) => s.zielgruppe === gewaehlt);
  const rest = EINSTIEG.filter((s) => !s.zielgruppe && s.key !== "einstieg-worum");

  return (
    <div className="space-y-8">
      <HelpTabs
        active="einstieg"
        istSuperAdmin={isSuperAdmin(user)}
        darfKuratieren={kannKuratieren(user)}
        eingeloggt={Boolean(user)}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Einstieg</h1>
          <p className="text-[var(--color-muted)]">
            Der kurze Weg hinein: worum es geht, dein Weg je nachdem, wie du
            Flipper betreibst — und was du getrost für später lassen kannst.
            Die ausführliche Anleitung liegt unter{" "}
            <Link href="/help" className="text-[var(--color-primary)] hover:underline">
              Anleitung
            </Link>
            .
          </p>
        </div>
        <HandbuchDownload />
      </div>

      <HilfeSektionen sektionen={allgemein} />

      {/* Zielgruppen-Wahl: Pillen wie die Unterreiter; die Wahl steht in der URL. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Ich bin …</span>
          <div role="tablist" aria-label="Zielgruppe" className="flex flex-wrap gap-2">
            {ZIELGRUPPEN.map((z) => {
              const aktiv = z.key === gewaehlt;
              return (
                <Link
                  key={z.key}
                  href={`/help/einstieg?ich=${z.key}`}
                  role="tab"
                  aria-selected={aktiv}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    aktiv
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  }`}
                >
                  {z.label}
                </Link>
              );
            })}
          </div>
        </div>
        <HilfeSektionen sektionen={zielgruppe} />
      </div>

      <HilfeSektionen sektionen={rest} />
    </div>
  );
}
