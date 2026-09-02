/*
  Darf diese Einladung (noch) angenommen werden? Rein, ohne Datenbank — dieselbe
  Regel für die Landeseite (Button oder Hinweis) und die Action (Ablehnung im
  Rennen, wenn die Einladung zwischen Laden und Klick abläuft). `nutzerEmail`
  null = noch nicht angemeldet, dann zählt nur der Zustand der Einladung.
*/
export type EinladungsStand = {
  status: string;
  expiresAt: Date;
  email: string;
};

export function einladungGesperrt(
  inv: EinladungsStand | null | undefined,
  nutzerEmail: string | null,
  jetzt: Date,
): string | null {
  if (!inv || inv.status !== "pending") {
    return "Einladung ungültig oder bereits verwendet.";
  }
  if (inv.expiresAt.getTime() < jetzt.getTime()) return "Einladung ist abgelaufen.";
  if (
    nutzerEmail !== null &&
    inv.email.toLowerCase() !== nutzerEmail.toLowerCase()
  ) {
    return "Diese Einladung gilt für eine andere E-Mail-Adresse.";
  }
  return null;
}
