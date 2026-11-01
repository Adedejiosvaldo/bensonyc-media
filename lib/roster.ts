import type { DepartmentId, Member } from './types';
import { addDays } from './dates';

export type Service = { date: string; label: string; special: boolean; kind: 'sunday' | 'midweek' };

/** Duties per department for each kind of service. Order matters: it is the display order. */
export function dutiesFor(dept: DepartmentId, service: Service): string[] {
  const sunday = service.kind === 'sunday';
  switch (dept) {
    case 'projection':
      return sunday
        ? ['Camera · 1st half', 'Camera · 2nd half', 'Laptop & TV', ...(service.special ? ['Phone camera (special)'] : [])]
        : ['Camera', 'Laptop & TV'];
    case 'photography':
      return sunday ? ['Photographer 1 · pre-service + service', 'Photographer 2 · service + edit before close'] : ['Photographer'];
    case 'content':
      return sunday ? ['In-service content', 'Sermon recording', 'After-service content'] : ['In-service content'];
    case 'design':
      return sunday ? ['Face of the Week', 'Next week flyers + reel covers'] : [];
    case 'social':
      return sunday ? ['Live stories during service', 'Instagram upload', 'WhatsApp + Facebook upload'] : ['Live stories during service'];
  }
}

export const DEPARTMENT_ORDER: DepartmentId[] = ['projection', 'photography', 'content', 'design', 'social'];

export function servicesForWeek(sunday: string, opts: { midweek: boolean; midweekDay: number; special: boolean }): Service[] {
  const list: Service[] = [{ date: sunday, label: opts.special ? 'Special Sunday service' : 'Sunday service', special: opts.special, kind: 'sunday' }];
  if (opts.midweek) list.push({ date: addDays(sunday, opts.midweekDay), label: 'Midweek service', special: false, kind: 'midweek' });
  return list;
}

export function isAvailable(m: Pick<Member, 'status' | 'break_until'>, date: string): boolean {
  if (m.status === 'inactive') return false;
  if (m.status === 'on_break') return !!m.break_until && m.break_until < date;
  return true;
}

export type DraftSlot = { service_date: string; service_label: string; department_id: DepartmentId; duty: string; member_id: string | null; sort: number };

/**
 * Fair shuffle: whoever served least in recent weeks goes first, ties broken at random.
 * Nobody takes two duties in the same department at the same service unless the team is too small.
 * The two Sunday camera halves always go to different people so nobody gets tired.
 */
export function buildRoster(
  members: Pick<Member, 'id' | 'department_id' | 'status' | 'break_until'>[],
  recentCounts: Record<string, number>,
  services: Service[],
  random: () => number = Math.random,
): DraftSlot[] {
  const counts: Record<string, number> = { ...recentCounts };
  const jitter: Record<string, number> = {};
  members.forEach((m) => (jitter[m.id] = random()));
  const slots: DraftSlot[] = [];
  let sort = 0;

  for (const service of services) {
    for (const dept of DEPARTMENT_ORDER) {
      const pool = members.filter((m) => m.department_id === dept && isAvailable(m, service.date));
      const usedHere = new Set<string>();
      for (const duty of dutiesFor(dept, service)) {
        const ranked = [...pool].sort(
          (a, b) => (counts[a.id] ?? 0) - (counts[b.id] ?? 0) || jitter[a.id] - jitter[b.id],
        );
        const pick = ranked.find((m) => !usedHere.has(m.id)) ?? ranked[0] ?? null;
        if (pick) {
          usedHere.add(pick.id);
          counts[pick.id] = (counts[pick.id] ?? 0) + 1;
        }
        slots.push({ service_date: service.date, service_label: service.label, department_id: dept, duty, member_id: pick?.id ?? null, sort: sort++ });
      }
    }
  }
  return slots;
}
