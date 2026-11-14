// Roster confirmations: deadlines, WhatsApp links and the emails sent when a roster is published,
// when replies are still missing on Thursday, and when someone declines.
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { addDays, label, todayLagos, weekStart } from '@/lib/dates';
import type { Member, RosterSlot } from '@/lib/types';

/** Replies are due by 8pm Lagos time on the Thursday before the Sunday (19:00 UTC). */
export function deadlineFor(sunday: string): string {
  return `${addDays(sunday, -3)}T19:00:00.000Z`;
}

export function deadlineLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', hour: 'numeric', minute: '2-digit' }).replace(':00', '');
}

/** A Nigerian number as WhatsApp wants it: digits with the country code, e.g. 0803 000 0000 → 2348030000000. */
export function waNumber(phone: string | null): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = `234${d.slice(1)}`;
  if (d.length === 10 && !d.startsWith('0')) d = `234${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? '';
const dutyLine = (s: Pick<RosterSlot, 'duty' | 'service_label' | 'service_date'>) => `${s.duty} at ${s.service_label}, ${label(s.service_date, 'long')}`;

/** Prefilled WhatsApp message asking one person to confirm their duty. Opens in WhatsApp; the lead taps send. */
export function waNudgeLink(phone: string | null, firstName: string, duties: Pick<RosterSlot, 'duty' | 'service_label' | 'service_date'>[], deadline: string | null) {
  const n = waNumber(phone);
  if (!n) return null;
  const by = deadlineLabel(deadline);
  const text = [
    `Hi ${firstName}, you're on ${duties.map(dutyLine).join(' and ')}. In by 7:30am.`,
    `Please accept or decline${by ? ` by ${by}` : ''} here: ${site()}/home`,
  ].join('\n');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function shell(title: string, sub: string, body: string, cta: string, path = '/home') {
  return `<!doctype html><html><body style="margin:0;background:#f7f1f7;font-family:Arial,Helvetica,sans-serif;color:#1b0f1d">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#2b0a2c;color:#fff;border-radius:20px;padding:28px">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f6b40e;font-weight:bold">Benson YC Media Unit</p>
    <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15">${esc(title)}</h1>
    <p style="margin:8px 0 0;color:#d9c6da">${esc(sub)}</p>
  </div>
  <div style="background:#fff;border-radius:20px;padding:24px;margin-top:12px">${body}
    <p style="margin:20px 0 0"><a href="${site()}${path}" style="background:#d6197a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">${esc(cta)}</a></p>
  </div>
</div></body></html>`;
}

type Person = Pick<Member, 'id' | 'full_name' | 'email' | 'phone'>;

async function load(weekId: string) {
  const db = createAdminClient();
  const [{ data: slots }, { data: members }, { data: week }] = await Promise.all([
    db.from('roster_slots').select('*').eq('week_id', weekId).not('member_id', 'is', null).order('sort').returns<RosterSlot[]>(),
    db.from('members').select('id, full_name, email, phone').returns<Person[]>(),
    db.from('roster_weeks').select('week_start, deadline').eq('id', weekId).single(),
  ]);
  return { db, slots: slots ?? [], members: new Map((members ?? []).map((m) => [m.id, m])), week };
}

const groupByMember = (slots: RosterSlot[]) => {
  const m = new Map<string, RosterSlot[]>();
  for (const s of slots) m.set(s.member_id!, [...(m.get(s.member_id!) ?? []), s]);
  return m;
};

/** Email everyone on the roster who hasn't been told about their duty yet. Returns how many emails went out. */
export async function notifyNewDuties(weekId: string) {
  const { db, slots, members, week } = await load(weekId);
  const fresh = slots.filter((s) => s.response === 'pending' && !s.notified_at);
  const by = deadlineLabel(week?.deadline ?? null);
  let sent = 0;
  for (const [memberId, duties] of groupByMember(fresh)) {
    const m = members.get(memberId);
    if (m?.email && process.env.RESEND_API_KEY) {
      const body = `<p style="margin:0 0 12px">You're on the roster:</p>
        <ul style="padding-left:18px;margin:0">${duties.map((d) => `<li style="margin:0 0 6px"><b>${esc(d.duty)}</b>, ${esc(d.service_label)}, ${esc(label(d.service_date, 'long'))}</li>`).join('')}</ul>
        <p style="margin:16px 0 0">Please <b>accept</b> or tell us you <b>can't make it</b>${by ? ` by <b>${esc(by)}</b>` : ''}. If you can't, your department gets the chance to cover you.</p>`;
      const res = await sendEmail(m.email, `Please confirm: ${duties.map((d) => d.duty).join(', ')} on ${label(duties[0].service_date, 'long')}`, shell(`Hi ${m.full_name.split(' ')[0]}, you've been rostered`, 'In by 7:30am (grace till 8:00)', body, 'Accept or decline'));
      if (res.ok) sent++;
    }
    // Mark them told even without email: they see it on Home, and the lead can nudge on WhatsApp.
    await db.from('roster_slots').update({ notified_at: new Date().toISOString() }).in('id', duties.map((d) => d.id));
  }
  return sent;
}

/** Thursday nudge to anyone who hasn't replied for the coming Sunday. */
export async function remindPending() {
  if (!process.env.RESEND_API_KEY) return { sent: 0 };
  const today = todayLagos();
  if (new Date(`${today}T12:00:00Z`).getUTCDay() !== 4) return { sent: 0 };
  const db = createAdminClient();
  const sunday = addDays(weekStart(today), 7);
  const { data: week } = await db.from('roster_weeks').select('id, published_at').eq('week_start', sunday).maybeSingle();
  if (!week?.published_at) return { sent: 0 };
  const { slots, members, week: w } = await load(week.id);
  const by = deadlineLabel(w?.deadline ?? null);
  let sent = 0;
  for (const [memberId, duties] of groupByMember(slots.filter((s) => s.response === 'pending'))) {
    const m = members.get(memberId);
    if (!m?.email) continue;
    const body = `<p style="margin:0">We haven't heard from you about <b>${esc(duties.map(dutyLine).join(' and '))}</b>. One tap tells your head whether Sunday is covered.</p>`;
    const res = await sendEmail(m.email, `Reminder: confirm your duty for Sunday${by ? ` by ${by}` : ''}`, shell('Can you make Sunday?', by ? `Please reply by ${by}` : 'Please reply today', body, 'Accept or decline'));
    if (res.ok) sent++;
  }
  return { sent };
}

/** Tell the admins someone can't make a duty, with their reason. */
export async function notifyDecline(slotId: string) {
  if (!process.env.RESEND_API_KEY) return;
  const db = createAdminClient();
  const { data: slot } = await db.from('roster_slots').select('*').eq('id', slotId).single<RosterSlot>();
  if (!slot?.member_id) return;
  const [{ data: who }, { data: admins }] = await Promise.all([
    db.from('members').select('full_name').eq('id', slot.member_id).single(),
    db.from('members').select('email').eq('role', 'admin').neq('status', 'inactive').not('email', 'is', null),
  ]);
  const body = `<p style="margin:0"><b>${esc(who?.full_name ?? 'Someone')}</b> can't make <b>${esc(dutyLine(slot))}</b>.</p>
    <p style="margin:12px 0 0">Reason: ${esc(slot.decline_reason ?? 'not given')}</p>
    <p style="margin:12px 0 0">Their department can see it needs cover and take it in the app. If nobody does, assign someone on the roster.</p>`;
  for (const a of admins ?? []) {
    if (a.email) await sendEmail(a.email, `Needs cover: ${slot.duty}, ${label(slot.service_date, 'long')}`, shell(`${slot.duty} needs cover`, label(slot.service_date, 'long'), body, 'Open the roster', `/roster?week=${weekStart(slot.service_date)}`));
  }
}
