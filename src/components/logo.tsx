/*
  Wort-Bild-Marke (Claude-Design-Handoff v2): ein Flipper-Gehäuse als Umriss
  mit Bordeaux-Akzentlinie + Schriftzug „pinball-manager". Der Umriss nutzt
  currentColor, folgt also der Textfarbe (hell/dunkel).
*/
export function Logo({
  size = 22,
  withWordmark = true,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  const height = Math.round((size / 76) * 90);
  return (
    <span className="flex items-center gap-2.5">
      <svg
        width={size}
        height={height}
        viewBox="0 0 76 90"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="70"
          height="84"
          rx="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
        <rect x="15" y="19" width="46" height="8" rx="2" fill="currentColor" />
        <rect
          x="15"
          y="60"
          width="46"
          height="4"
          rx="1"
          fill="var(--color-faint)"
        />
        <rect
          x="15"
          y="71"
          width="26"
          height="4"
          rx="1"
          fill="var(--color-accent)"
        />
      </svg>
      {withWordmark ? (
        <span className="text-[17px] font-bold tracking-[-0.2px]">
          pinball<span className="text-[var(--color-accent)]">-manager</span>
        </span>
      ) : null}
    </span>
  );
}
