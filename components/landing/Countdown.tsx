'use client';
import { useEffect, useState } from 'react';

const LAGOS = 3_600_000; // UTC+1, no daylight saving

/** Milliseconds until the next Sunday service starts, or null while it's on. */
function untilService(start: string, end: string, now = Date.now()) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const local = new Date(now + LAGOS);
  const day = local.getUTCDay();
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (day === 0 && mins >= sh * 60 + sm && mins < eh * 60 + em) return null;
  const daysAhead = day === 0 && mins < sh * 60 + sm ? 0 : 7 - day;
  const target = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + daysAhead, sh, sm) - LAGOS;
  return target - now;
}

export function Countdown({ start, end }: { start: string; end: string }) {
  const [ms, setMs] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    const tick = () => setMs(untilService(start, end));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [start, end]);

  if (ms === null) {
    return (
      <p className="flex items-center gap-3 font-display text-4xl uppercase text-white sm:text-5xl">
        <span className="rec-dot" /> Service is on now
      </p>
    );
  }
  const s = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const parts = [
    ['days', Math.floor(s / 86400)],
    ['hrs', Math.floor((s % 86400) / 3600)],
    ['mins', Math.floor((s % 3600) / 60)],
    ['secs', s % 60],
  ] as const;
  return (
    <div className="flex gap-2 sm:gap-3" aria-label="Time until Sunday service" role="timer">
      {parts.map(([label, v]) => (
        <div key={label} className="cd-box">
          <p className="font-display text-4xl tabular-nums text-gold sm:text-5xl">{ms === undefined ? '–' : String(v).padStart(2, '0')}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">{label}</p>
        </div>
      ))}
    </div>
  );
}
