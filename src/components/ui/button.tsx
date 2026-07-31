import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-accent)] hover:text-[var(--color-primary-fg)]",
  secondary:
    "border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
  danger:
    "bg-[var(--color-danger)] text-[var(--color-primary-fg)] hover:opacity-90",
};

/* "sm" ist das Zeilen-Format (Listen-Aktionen, Inline-Formulare) — ersetzt die
   früher handgerollten `px-3 py-1.5`-Buttons. "md" bleibt der Standard. */
const sizes: Record<Size, string> = {
  md: "px-4 py-2",
  sm: "px-3 py-1.5",
};

/* ComponentProps<"button"> schließt in React 19 auch `ref` ein — Refs werden
   ohne forwardRef einfach durchgereicht (nutzt z. B. ConfirmButton für den
   Fokus-Sprung auf „Ja …"). */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
