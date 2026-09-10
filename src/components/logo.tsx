export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Gymly"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="gymly-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF7D4D" />
          <stop offset="100%" stopColor="#D43F08" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="118" fill="url(#gymly-mark)" />
      <g fill="#fff">
        <rect x="170" y="238" width="172" height="36" rx="18" />
        <rect x="132" y="192" width="46" height="128" rx="20" />
        <rect x="334" y="192" width="46" height="128" rx="20" />
        <rect x="92" y="220" width="32" height="72" rx="15" opacity="0.72" />
        <rect x="388" y="220" width="32" height="72" rx="15" opacity="0.72" />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-[21px] font-bold tracking-tight">
        Gym<span className="ember-text">ly</span>
      </span>
    </span>
  );
}
