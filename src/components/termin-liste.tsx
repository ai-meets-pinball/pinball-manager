import Link from "next/link";
import { Check, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTermin, erledigeTermin } from "@/db/actions/termine";
import { tageDazwischen } from "@/lib/faelligkeit";

export type TerminEintrag = {
  id: string;
  titel: string;
  notiz: string | null;
  datum: Date;
  erinnerungTageVorher: number;
  wiederholenMonate: number | null;
};

/* Offene Termine eines Geräts (nächster zuerst), mit Fälligkeits-Label +
   Erledigen/Bearbeiten/Löschen. Server-Komponente (Formulare = Server-Actions).
   „Erledigt" rückt einen wiederkehrenden Termin weiter, sonst schließt es ihn. */
function faelligLabel(tage: number): { text: string; ton: string } {
  if (tage < 0)
    return {
      text: `überfällig seit ${-tage} Tag${-tage === 1 ? "" : "en"}`,
      ton: "text-[var(--color-danger)]",
    };
  if (tage === 0) return { text: "heute fällig", ton: "text-[var(--color-fg)]" };
  return {
    text: `in ${tage} Tag${tage === 1 ? "" : "en"}`,
    ton:
      tage <= 14 ? "text-[var(--color-fg)]" : "text-[var(--color-muted)]",
  };
}

export function TerminListe({
  termine,
  machineId,
  schreibbar = true,
}: {
  termine: TerminEintrag[];
  machineId: string;
  schreibbar?: boolean;
}) {
  const jetzt = new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Termine</h3>
        {schreibbar ? (
          <Link
            href={`/machines/${machineId}/termine/new`}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
          >
            <Plus size={15} /> Neuer Termin
          </Link>
        ) : null}
      </div>

      {termine.length === 0 ? (
        <p className="text-[var(--color-muted)]">Keine anstehenden Termine.</p>
      ) : (
        termine.map((t) => {
          const f = faelligLabel(tageDazwischen(jetzt, t.datum));
          return (
            <Card key={t.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{t.titel}</span>
                {t.wiederholenMonate ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                    <Repeat size={10} /> alle {t.wiederholenMonate} Monate
                  </span>
                ) : null}
                <span className={`ml-auto text-xs ${f.ton}`}>
                  {t.datum.toLocaleDateString("de-DE")} · {f.text}
                </span>
              </div>

              {t.notiz ? (
                <p className="whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                  {t.notiz}
                </p>
              ) : null}

              {schreibbar ? (
                <div className="flex flex-wrap gap-3 text-sm">
                  <form action={erledigeTermin}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                    >
                      <Check size={14} /> Erledigt
                      {t.wiederholenMonate ? " (nächster Termin)" : ""}
                    </button>
                  </form>
                  <Link
                    href={`/machines/${machineId}/termine/${t.id}/edit`}
                    className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  >
                    <Pencil size={14} /> Bearbeiten
                  </Link>
                  <form action={deleteTermin}>
                    <input type="hidden" name="machineId" value={machineId} />
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton
                      question="Diesen Termin löschen?"
                      confirmLabel="Ja, löschen"
                      className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={14} /> Löschen
                    </ConfirmButton>
                  </form>
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
