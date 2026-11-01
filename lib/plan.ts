import type { DepartmentId, PlanMonth, Pillar } from './types';
import { addDays, monthStart, weekOfMonth } from './dates';

/** The weekly rhythm every week is built on. Day 0 = Sunday. */
export const RHYTHM: { dow: number; series: string; pillar: Pillar; format: string; dept: DepartmentId }[] = [
  { dow: 0, series: 'Live from YC', pillar: 'Community', format: 'Stories', dept: 'social' },
  { dow: 1, series: 'Sunday in 60', pillar: 'Word', format: 'Reel', dept: 'content' },
  { dow: 2, series: 'YC Notes', pillar: 'Word', format: 'Carousel', dept: 'design' },
  { dow: 3, series: 'Faces of YC', pillar: 'People', format: 'Reel', dept: 'content' },
  { dow: 4, series: 'Inside YC', pillar: 'Community', format: 'Reel', dept: 'content' },
  { dow: 5, series: 'Friday Fire', pillar: 'Word', format: 'Reel', dept: 'content' },
  { dow: 6, series: 'See You Sunday', pillar: 'Events', format: 'Reel + flyer', dept: 'design' },
];

export type DraftItem = {
  day: string;
  series: string;
  pillar: Pillar;
  format: string;
  title: string;
  brief: string;
  department_id: DepartmentId;
  sort: number;
};

/** The plan month a week belongs to: the month of its Wednesday. */
export function monthForWeek(sunday: string, months: PlanMonth[]): PlanMonth | null {
  const key = monthStart(addDays(sunday, 3));
  return months.find((m) => m.month === key) ?? null;
}

/** Turn one month of the master plan into a Sunday → Saturday set of posts. */
export function buildWeek(sunday: string, month: PlanMonth | null): DraftItem[] {
  const theme = month?.theme ?? 'This is YC';
  const moment = month?.big_moment ?? 'Sunday service';
  const n = weekOfMonth(addDays(sunday, 3));
  const businessWeek = n % 2 === 0;

  const items: DraftItem[] = RHYTHM.map((r) => {
    const day = addDays(sunday, r.dow);
    const base = { day, series: r.series, pillar: r.pillar, format: r.format, department_id: r.dept, sort: r.dow * 10 };
    switch (r.dow) {
      case 0:
        return { ...base, title: 'Stories all service', brief: `Post 6–10 stories during service: worship, the sermon title card, a first-timer welcome. Send the 3 best photos to the media group by 3pm. Theme sticker: "${theme}".` };
      case 1:
        return { ...base, title: 'Sermon clip of the week', brief: `Pick the strongest 30–60s from yesterday's sermon. Hook in the first 2 seconds, burned-in captions, end card with @mfmbensonyc. Caption ties it to "${theme}".` };
      case 2:
        return { ...base, title: `Teaching carousel: ${theme}`, brief: `5–7 slides. Slide 1 is a bold hook on purple; slides 2–6 one point each on cream with a scripture; last slide asks people to save and share.` };
      case 3:
        return { ...base, title: 'Member spotlight', brief: `20–45s with one member. Ask: "What does '${theme}' mean to you?" or "Why do you come to YC?" Film vertical, outside or near a window.` };
      case 4:
        return { ...base, title: 'Behind the scenes', brief: `Show a unit at work: choir rehearsal, media desk, ushers setting up, prep for ${moment}. Fast cuts, trending sound.` };
      case 5:
        return businessWeek
          ? { ...base, series: 'Kingdom Business Minute', pillar: 'People', title: 'Short business talk', brief: `60–90s with a member who runs a business or side hustle: one practical lesson + one scripture. Keep it real and useful.` }
          : { ...base, title: 'Friday encouragement', brief: `A 15–30s word for the weekend, or a clean trend done YC-style. Tie it to "${theme}".` };
      default:
        return { ...base, title: 'Invite for tomorrow', brief: `15–20s face-to-camera invite: "See you tomorrow at YC!" Pair with the flyer if there is an event. Pin it if it is for ${moment}.` };
    }
  });

  // The month's hero beat, placed on Thursday as an extra post.
  const hero =
    n === 1
      ? { title: `Theme launch: ${theme}`, brief: `Announce the month: a reel or carousel that introduces "${theme}" and what is coming (${moment}).` }
      : n === 2
        ? { title: 'Hero content of the month', brief: month?.hero_content ?? 'The month’s main shareable piece.' }
        : n === 3
          ? { title: `Countdown: ${moment}`, brief: `Invite + countdown for ${moment}. Collab post with the guest or ministers. Boost the best-performing invite reel.` }
          : { title: `Recap: ${moment}`, brief: `24-hour recap reel and 2 testimony clips from ${moment}. Thank everyone who came.` };

  items.push({
    day: addDays(sunday, 4),
    series: 'Monthly hero',
    pillar: n === 3 ? 'Events' : 'People',
    format: 'Reel',
    department_id: 'content',
    sort: 45,
    ...hero,
  });

  return items.sort((a, b) => a.sort - b.sort);
}
