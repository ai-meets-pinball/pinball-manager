/*
  Ist `pfad` ein sicheres, seiten-internes Rücksprungziel? Nur so darf ein
  aus der URL (?von=) stammender Wert in einen Redirect/`router.push` fließen —
  sonst wäre es ein Open-Redirect auf eine fremde Seite (Phishing).

  Zugelassen: ein absoluter Pfad DIESER App, der mit „/" beginnt.
  Abgelehnt: alles ohne führendes „/", sowie „//…" und „/\…" — Letztere
  normalisieren Browser zu protokoll-relativen URLs (`//host`, `/\host`) und
  landen damit auf einer fremden Origin.
*/
export function istSichererPfad(
  pfad: string | null | undefined,
): pfad is string {
  return (
    typeof pfad === "string" &&
    pfad.startsWith("/") &&
    !pfad.startsWith("//") &&
    !pfad.startsWith("/\\")
  );
}
