// All dates are handled as 'YYYY-MM-DD' strings in Lagos time (UTC+1, no DST).

const DAY = 86_400_000;

export function todayLagos(): string {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}

export function parse(d: string): Date {
  return new Date(d + 'T00:00:00Z');
}

export function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  return fmt(new Date(parse(d).getTime() + n * DAY));
}

/** The Sunday that starts the week containing `d` (weeks run Sunday → Saturday). */
export function weekStart(d: string): string {
  return addDays(d, -parse(d).getUTCDay());
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthStart(d: string): string {
  return d.slice(0, 8) + '01';
}

/** 1-based index of the week inside its month, counted by Sundays. */
export function weekOfMonth(sunday: string): number {
  return Math.floor((parse(sunday).getUTCDate() - 1) / 7) + 1;
}

const opts = (o: Intl.DateTimeFormatOptions) => ({ ...o, timeZone: 'UTC' });

export function label(d: string, style: 'short' | 'long' | 'day' | 'month' = 'short'): string {
  const date = parse(d);
  if (style === 'day') return date.toLocaleDateString('en-GB', opts({ weekday: 'short' }));
  if (style === 'month') return date.toLocaleDateString('en-GB', opts({ month: 'long', year: 'numeric' }));
  if (style === 'long') return date.toLocaleDateString('en-GB', opts({ weekday: 'long', day: 'numeric', month: 'long' }));
  return date.toLocaleDateString('en-GB', opts({ day: 'numeric', month: 'short' }));
}

export function rangeLabel(start: string): string {
  return `${label(start)} – ${label(addDays(start, 6))}`;
}

export function isValidDate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime());
}
