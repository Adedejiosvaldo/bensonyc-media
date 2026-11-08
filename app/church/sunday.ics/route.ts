import { CHURCH } from '@/content/church';
import { addDays, todayLagos, weekStart } from '@/lib/dates';
import { buildCalendar } from '@/lib/ics';

export const dynamic = 'force-dynamic';

/** "Add to calendar": a weekly Sunday service event that repeats every week. */
export async function GET() {
  const today = todayLagos();
  const sunday = new Date(today + 'T00:00:00Z').getUTCDay() === 0 ? today : addDays(weekStart(today), 7);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const ics = buildCalendar(CHURCH.name, [
    {
      uid: 'sunday-service@bensonyc',
      summary: `${CHURCH.sunday.label} · ${CHURCH.short}`,
      description: `See you Sunday at ${CHURCH.name}. Follow @${CHURCH.instagram} for what's on.`,
      location: CHURCH.area,
      url: site ? `${site}/church` : undefined,
      date: sunday,
      start: CHURCH.sunday.start,
      end: CHURCH.sunday.end,
      rrule: 'FREQ=WEEKLY;BYDAY=SU',
    },
  ]);
  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="benson-yc-sunday.ics"' },
  });
}
