/*
  DAS Fehler-/Erfolgs-Paar für Formulare (ersetzt die früher fünffach kopierten
  <p>-Zeilen). Bewusst OHNE "use client": ein reines Render-Bauteil, nutzbar in
  Server- wie Client-Komponenten. Der Prop-Typ ist strukturell — jedes FormState
  ({ error?, message? }) passt ohne Import.
*/
export function FormFeedback({
  state,
}: {
  state: { error?: string; message?: string };
}) {
  if (!state.error && !state.message) return null;
  return state.error ? (
    <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
  ) : (
    <p className="text-sm text-[var(--color-success)]">{state.message}</p>
  );
}
