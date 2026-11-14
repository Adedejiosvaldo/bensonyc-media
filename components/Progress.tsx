export function ProgressBar({ value, max, label, className = '' }: { value: number; max: number; label?: string; className?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-plum-100 ${className}`}
      role="progressbar"
      aria-label={label ?? 'Progress'}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${value} of ${max}`}
    >
      <div className="h-full rounded-full bg-magenta transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, max, size = 72 }: { value: number; max: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? value / max : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`${value} of ${max} lessons done`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--plum-100))" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgb(var(--magenta))"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-ink font-display tabular-nums" fontSize={size / 3.6} aria-hidden="true">
        {value}/{max}
      </text>
    </svg>
  );
}
