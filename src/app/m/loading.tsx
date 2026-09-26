import { Spinner } from "@/components/ui/spinner";

/* Wartezustand auf der Geräte-QR-Meldeseite, siehe (app)/loading.tsx. */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-[var(--color-muted)]">
      <Spinner size={24} label="Lädt …" />
    </main>
  );
}
