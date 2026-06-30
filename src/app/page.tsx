import Link from "next/link";
import { Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <Wrench size={20} className="text-[var(--color-primary)]" />
          Pinball Manager
        </span>
        <ThemeToggle />
      </header>

      <section className="flex flex-1 flex-col justify-center gap-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Flipper verwalten, Fehler erfassen, Reparaturen dokumentieren.
          </h1>
          <p className="text-[var(--color-muted)]">
            Die Reparatur- und Verwaltungsdatenbank für deine Flipperautomaten —
            allein oder im Club.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/machines"
            className="inline-flex items-center rounded-[var(--radius)] bg-[var(--color-primary)] px-5 py-2.5 font-medium text-[var(--color-primary-fg)] transition-opacity hover:opacity-90"
          >
            Zu den Maschinen
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-[var(--radius)] border border-[var(--color-border)] px-5 py-2.5 font-medium transition-colors hover:bg-[var(--color-border)]/40"
          >
            Anmelden
          </Link>
        </div>
      </section>
    </main>
  );
}
