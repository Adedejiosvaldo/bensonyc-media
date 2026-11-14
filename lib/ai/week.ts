import { addDays, weekStart } from '@/lib/dates';

/**
 * Which week to plan when someone asks for ideas while looking at `sunday`'s week.
 * A week that is already over, or has fewer than 3 days left (Friday or Saturday), is too late to plan:
 * plan the week ahead instead. A future week, or the current week from Sunday to Thursday, is planned as asked.
 */
export function planningWeek(sunday: string, today: string): string {
  const thisWeek = weekStart(today);
  if (sunday > thisWeek) return sunday;
  const daysLeft = 7 - new Date(`${today}T12:00:00Z`).getUTCDay(); // today through Saturday
  if (sunday < thisWeek || daysLeft < 3) return addDays(thisWeek, 7);
  return sunday;
}
