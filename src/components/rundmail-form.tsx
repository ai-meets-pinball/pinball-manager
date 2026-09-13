"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Field, Textarea } from "@/components/ui/input";
import type { FormState } from "@/db/actions/form-state";
import { invitePlatformUsers, sendeRundmailTest } from "@/db/actions/invitations";
import { MAX_ADRESSEN, parseAdressen } from "@/lib/adressen";

/*
  Unterer Teil der Einladungs-Rundmail: Testmail an sich selbst und der
  eigentliche Versand. Die Adressen werden schon hier gezählt (lib/adressen,
  dieselbe Regel wie im Server), damit die Rückfrage die Zahl nennt und der
  Knopf ohne gültige Adresse gar nicht erst scharf ist. Das Ergebnis kommt
  zeilenweise zurück (eine Zeile je Adresse) und bleibt stehen, bis die Seite
  verlassen wird — es ist der Beleg, wer eingeladen wurde.
*/
export function RundmailVersand({ eigeneAdresse }: { eigeneAdresse: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    invitePlatformUsers,
    {},
  );
  const [adressen, setAdressen] = useState("");
  const { gueltig, ungueltig, zuViele } = parseAdressen(adressen);

  return (
    <section className="space-y-3">
      <Card className="space-y-3 bg-[var(--color-surface-2)]">
        <div>
          <p className="font-medium">3 · Testmail</p>
          <p className="text-sm text-[var(--color-muted)]">
            Schickt die gespeicherte Fassung an dich selbst ({eigeneAdresse}),
            mit Beispiel-Link und ohne eine Einladung anzulegen.
          </p>
        </div>
        <ActionForm action={sendeRundmailTest} className="space-y-2">
          <Button type="submit" size="sm" variant="secondary">
            <Send size={14} /> Testmail an mich
          </Button>
        </ActionForm>
      </Card>

      <Card className="space-y-3 bg-[var(--color-surface-2)]">
        <div>
          <p className="font-medium">4 · Empfänger &amp; Versand</p>
          <p className="text-sm text-[var(--color-muted)]">
            Wer schon ein Konto hat, wird übersprungen. Eine offene Einladung
            an dieselbe Adresse wird durch die neue ersetzt. Alles landet im
            Mail-Protokoll; gespeicherte Einladungen ohne Versand stehen unter
            »Offene Einladungen«.
          </p>
        </div>
        <form action={formAction} className="space-y-3">
          <Field
            label="E-Mail-Adressen"
            hint={`Eine je Zeile (auch Komma oder Semikolon), höchstens ${MAX_ADRESSEN} je Durchgang.`}
          >
            <Textarea
              name="adressen"
              rows={8}
              value={adressen}
              onChange={(e) => setAdressen(e.target.value)}
              required
            />
          </Field>
          <p className="text-xs text-[var(--color-muted)]">
            {gueltig.length} gültige Adresse{gueltig.length === 1 ? "" : "n"}
            {ungueltig.length > 0 ? ` · ${ungueltig.length} ungültig (wird übersprungen)` : ""}
            {zuViele > 0 ? ` · ${zuViele} über dem Limit` : ""}
          </p>
          <Field
            label="Persönliche Nachricht (optional)"
            hint="Für alle gleich; steht in der Mail als zitierter Absatz unter dem Text."
          >
            <Textarea name="message" rows={3} />
          </Field>
          <div>
            <ConfirmButton
              question={`${gueltig.length} Einladung${gueltig.length === 1 ? "" : "en"} verschicken? Jede Person bekommt ihren eigenen Link.`}
              confirmLabel="Ja, verschicken"
              disabled={pending || gueltig.length === 0}
              className={buttonStyles()}
            >
              <Send size={14} /> {pending ? "Wird verschickt…" : "Einladungen verschicken"}
            </ConfirmButton>
          </div>
          <FormFeedback state={{ error: state.error }} />
          {state.message ? (
            <div
              role="status"
              className="whitespace-pre-line rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
            >
              {state.message}
            </div>
          ) : null}
        </form>
      </Card>
    </section>
  );
}
