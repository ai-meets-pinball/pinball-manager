/*
  DER Avatar: Profilbild, sonst Initialen im Kreis. Server-tauglich (kein
  "use client"). Initialen kommen vorberechnet rein (lib/format.ts initialen()).
*/
export function Avatar({
  image,
  kuerzel,
  size = 28,
}: {
  image: string | null;
  kuerzel: string;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full border border-[var(--color-border)] object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-inset)] font-semibold text-[var(--color-muted)]"
      aria-hidden
    >
      {kuerzel}
    </span>
  );
}
