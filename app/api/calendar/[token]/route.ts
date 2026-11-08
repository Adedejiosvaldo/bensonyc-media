import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, todayLagos } from '@/lib/dates';
import { buildCalendar, type IcsEvent } from '@/lib/ics';
import type { ContentItem, RosterSlot } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Private, read-only calendar feed for one member: their roster duties and the content they own.
 * Subscribe from Google Calendar, Apple Calendar or Outlook using the link on the Availability page.
 * The token is secret; members can reset it to cut off an old link.
 */
export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token.replace(/\.ics$/, '');
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse('Not found', { status: 404 });

  const supabase = createAdminClient();
  const { data: row } = await supabase.from('calendar_tokens').select('member_id').eq('token', token).maybeSingle();
  if (!row) return new NextResponse('Not found', { status: 404 });

  const from = addDays(todayLagos(), -28);
  const [{ data: slots }, { data: items }] = await Promise.all([
    supabase.from('roster_slots').select('*').eq('member_id', row.member_id).gte('service_date', from).order('service_date').returns<RosterSlot[]>(),
    supabase.from('content_items').select('*').eq('owner_id', row.member_id).gte('day', from).order('day').returns<ContentItem[]>(),
  ]);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const events: IcsEvent[] = [
    ...(slots ?? []).map((s) => {
      const sunday = new Date(s.service_date + 'T00:00:00Z').getUTCDay() === 0;
      return {
        uid: `slot-${s.id}@bensonyc-media`,
        summary: `Media duty: ${s.duty}`,
        description: `${s.service_label}. In by 7:30am, grace till 8:00.`,
        url: site ? `${site}/roster?week=${addDays(s.service_date, -new Date(s.service_date + 'T00:00:00Z').getUTCDay())}` : undefined,
        date: s.service_date,
        // Sunday call time is fixed; midweek times vary, so those are all-day.
        ...(sunday ? { start: '07:30', end: '12:30' } : {}),
      };
    }),
    ...(items ?? [])
      .filter((i) => i.status !== 'skipped')
      .map((i) => ({
        uid: `content-${i.id}@bensonyc-media`,
        summary: `${i.status === 'posted' ? '✓ ' : ''}${i.series}: ${i.title}`,
        description: `${i.format} · ${i.pillar}\n\n${i.brief}`,
        url: site ? `${site}/content?week=${i.week_start}` : undefined,
        date: i.day,
      })),
  ];

  return new NextResponse(buildCalendar('Benson YC Media', events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=900',
      'Content-Disposition': 'inline; filename="bensonyc-media.ics"',
    },
  });
}
