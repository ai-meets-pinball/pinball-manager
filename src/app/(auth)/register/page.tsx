import Link from "next/link";
import { STAMMTISCH_URL } from "@/lib/links";

/*
  Selbstregistrierung ist derzeit deaktiviert (Sicherheitsgründe). Die harte
  Grenze sitzt in Better Auth (disableSignUp) — diese Seite erklärt es nur.
*/
export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div className="space-y-3">
        <div className="font-mono text-xs uppercase tracking-[1px] text-[var(--color-faint)]">
          Registrierung pausiert
        </div>
        <h1 className="text-2xl font-bold">
          Aktuell keine Selbstregistrierung.
        </h1>
        <p className="text-sm leading-[1.65] text-[var(--color-muted)]">
          Aus Sicherheitsgründen legen wir derzeit keine neuen Konten per
          Selbstregistrierung an. Der Zugang läuft über den „KI meets
          Pinball&ldquo;-Stammtisch.
        </p>
      </div>

      <a
        href={STAMMTISCH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-[var(--radius)] bg-[var(--color-primary)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-accent)]"
      >
        Zugang über den Stammtisch ↗
      </a>

      <p className="text-sm text-[var(--color-muted)]">
        Schon ein Konto?{" "}
        <Link href="/login" className="text-[var(--color-accent)] underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
