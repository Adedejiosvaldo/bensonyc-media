export type Lesson = {
  slug: string;
  title: string;
  minutes: number;
  summary: string;
  /** Rich body is rendered by the lesson page based on slug. */
};

export const LESSONS: Lesson[] = [
  { slug: 'welcome', title: 'Welcome to the Media Unit', minutes: 3, summary: 'Why we exist, where we are, and the 10K goal.' },
  { slug: 'brand', title: 'Our brand: how YC looks and sounds', minutes: 6, summary: 'Colours, fonts, logo, voice and the do’s and don’ts.' },
  { slug: 'rules', title: 'Rules & regulations', minutes: 3, summary: 'Time, dress code and conduct. Sign the pledge to finish.' },
  { slug: 'department', title: 'Your department', minutes: 5, summary: 'Your duties before, during and after service.' },
  { slug: 'workflow', title: 'How a week works', minutes: 4, summary: 'The weekly rhythm, the content board and the roster.' },
  { slug: 'plan', title: 'The 9-month plan', minutes: 4, summary: 'Monthly themes and big moments from now to July 2027.' },
];

export const lessonBySlug = (slug: string) => LESSONS.find((l) => l.slug === slug) ?? null;
