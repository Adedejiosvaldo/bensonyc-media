export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-plum-100 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-magenta to-gold transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, max, size = 72 }: { value: number; max: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? value / max : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-label={`${value} of ${max}`}>
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
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-ink font-display" fontSize={size / 3.6}>
        {value}/{max}
      </text>
    </svg>
  );
}
