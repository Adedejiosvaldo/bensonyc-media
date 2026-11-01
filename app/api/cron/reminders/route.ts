import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { departmentById } from '@/content/departments';
import { addDays, label, todayLagos, weekStart } from '@/lib/dates';
import { sendEmail } from '@/lib/email';
import type { ContentItem, Member, RosterSlot } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Runs every Saturday (vercel.json). Emails everyone on tomorrow's roster their duty,
 * their department checklist, and the content they own in the coming week.
 * Test by hand: GET /api/cron/reminders?dry=1 with the Authorization header.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const supabase = createAdminClient();
  const sunday = addDays(weekStart(todayLagos()), 7);

  const { data: week } = await supabase.from('roster_weeks').select('id').eq('week_start', sunday).maybeSingle();
  if (!week) return NextResponse.json({ sent: 0, note: `No roster for ${sunday}` });

  const [{ data: slots }, { data: members }, { data: items }] = await Promise.all([
    supabase.from('roster_slots').select('*').eq('week_id', week.id).not('member_id', 'is', null).order('sort').returns<RosterSlot[]>(),
    supabase.from('members').select('*').returns<Member[]>(),
    supabase.from('content_items').select('*').eq('week_start', sunday).returns<ContentItem[]>(),
  ]);

  const byMember = new Map<string, RosterSlot[]>();
  (slots ?? []).forEach((s) => byMember.set(s.member_id!, [...(byMember.get(s.member_id!) ?? []), s]));
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const results: { to: string; ok: boolean }[] = [];

  for (const [memberId, duties] of byMember) {
    const m = (members ?? []).find((x) => x.id === memberId);
    if (!m?.email) continue;
    const dept = departmentById(m.department_id);
    const owned = (items ?? []).filter((i) => i.owner_id === m.id);
    const html = emailHtml({ name: m.full_name.split(' ')[0], sunday, duties, checklist: dept?.before ?? [], owned, site });
    if (dry) {
      results.push({ to: m.email, ok: true });
      continue;
    }
    const res = await sendEmail(m.email, `Your duty tomorrow: ${duties.map((d) => d.duty).join(', ')}`, html);
    results.push({ to: m.email, ok: res.ok });
  }
  return NextResponse.json({ sunday, sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, dry });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function emailHtml(p: { name: string; sunday: string; duties: RosterSlot[]; checklist: string[]; owned: ContentItem[]; site: string }) {
  const li = (s: string) => `<li style="margin:0 0 6px">${esc(s)}</li>`;
  return `<!doctype html><html><body style="margin:0;background:#f7f1f7;font-family:Arial,Helvetica,sans-serif;color:#1b0f1d">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#2b0a2c;color:#fff;border-radius:20px;padding:28px">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f6b40e;font-weight:bold">Benson YC Media Unit</p>
    <h1 style="margin:10px 0 0;font-size:28px;line-height:1.1">Hi ${esc(p.name)}, you're on duty tomorrow</h1>
    <p style="margin:8px 0 0;color:#d9c6da">${esc(label(p.sunday, 'long'))} · in by 7:30am (grace till 8:00)</p>
  </div>
  <div style="background:#fff;border-radius:20px;padding:24px;margin-top:12px">
    <h2 style="margin:0 0 12px;font-size:18px">Your duty</h2>
    <ul style="padding-left:18px;margin:0">${p.duties.map((d) => li(`${d.duty} (${d.service_label}, ${label(d.service_date, 'long')})`)).join('')}</ul>
    ${p.checklist.length ? `<h2 style="margin:20px 0 12px;font-size:18px">Before service</h2><ul style="padding-left:18px;margin:0">${p.checklist.map(li).join('')}</ul>` : ''}
    ${p.owned.length ? `<h2 style="margin:20px 0 12px;font-size:18px">Content you own this week</h2><ul style="padding-left:18px;margin:0">${p.owned.map((i) => li(`${label(i.day, 'day')}: ${i.series}, ${i.title}`)).join('')}</ul>` : ''}
    <p style="margin:20px 0 0;font-size:14px;color:#6e5e70">Ladies: no nails, earrings or necklaces. Men: well dressed, no slippers. Go down to church as soon as service starts.</p>
    ${p.site ? `<p style="margin:20px 0 0"><a href="${p.site}/home" style="background:#d6197a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">Open the media app</a></p>` : ''}
  </div>
  <p style="text-align:center;font-size:12px;color:#8a7a8c;margin-top:16px">Can't make it? Swap with someone in your department and tell your head today.</p>
</div></body></html>`;
}
