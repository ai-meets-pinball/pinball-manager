import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[0_8px_30px_rgba(255,106,61,0.35)] hover:bg-[var(--color-primary-soft)] hover:-translate-y-0.5",
  secondary:
    "border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-soft)]",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
