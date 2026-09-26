import { Spinner } from "@/components/ui/spinner";

/* Wartezustand beim Wechsel zwischen den Hilfe-Seiten (siehe (app)/loading.tsx). */
export default function Loading() {
  return (
    <div className="flex justify-center py-16 text-[var(--color-muted)]">
      <Spinner size={24} label="Lädt …" />
    </div>
  );
}
