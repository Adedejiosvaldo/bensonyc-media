// Minimal iCalendar (RFC 5545) writer for the duty feed.

export type IcsEvent = {
  uid: string;
  summary: string;
  description?: string;
  url?: string;
  /** 'YYYY-MM-DD' for all-day events */
  date: string;
  /** Lagos local times ('HH:MM'); omit for all-day */
  start?: string;
  end?: string;
};

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines must be folded at 75 octets; continuation lines start with a space. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

const compact = (d: string) => d.replace(/-/g, '');

/** Lagos is UTC+1 all year, so convert local time to UTC by subtracting an hour. */
function lagosToUtc(date: string, hhmm: string): string {
  const t = new Date(`${date}T${hhmm}:00+01:00`);
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildCalendar(name: string, events: IcsEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Benson YC Media//Duty feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    'X-WR-TIMEZONE:Africa/Lagos',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(e.summary)}`);
    if (e.start && e.end) {
      lines.push(`DTSTART:${lagosToUtc(e.date, e.start)}`, `DTEND:${lagosToUtc(e.date, e.end)}`);
    } else {
      const next = new Date(new Date(e.date + 'T00:00:00Z').getTime() + 86_400_000).toISOString().slice(0, 10);
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(next)}`);
    }
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
