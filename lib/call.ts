import { RULES } from '@/content/rules';
import { LESSONS } from '@/content/lessons';

/** "Be in church by 7:30am. Grace period ends at 8:00am." → { call: '7:30am', grace: '8:00am' } */
export function sundayCall() {
  const rule = RULES.time[0] ?? '';
  const call = rule.match(/by\s+([0-9:]+\s?(?:am|pm))/i)?.[1] ?? null;
  const grace = rule.match(/ends at\s+([0-9:]+\s?(?:am|pm))/i)?.[1] ?? null;
  return { call, grace };
}

/** The Sunday arrival time a department lists in its own "before service" checklist, if it has one. */
export function callTime(before: string[]) {
  for (const line of before) {
    const m = line.match(/arrive by\s+([0-9:]+\s?(?:am|pm))/i);
    if (m) return m[1].replace(/\s/g, '');
  }
  return null;
}

export const lessonsMinutes = LESSONS.reduce((total, lesson) => total + lesson.minutes, 0);
