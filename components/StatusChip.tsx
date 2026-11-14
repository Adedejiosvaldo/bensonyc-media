import type { ContentStatus } from '@/lib/types';

// Chip text uses the -ink tokens, which hold 4.5:1 on their tinted fill in both themes.
const styles: Record<ContentStatus, string> = {
  planned: 'bg-plum-100 text-ink',
  shot: 'bg-gold/25 text-warn-ink',
  edited: 'bg-magenta/10 text-accent',
  posted: 'bg-good/15 text-good-ink',
  skipped: 'bg-line text-muted',
};

export function StatusChip({ status }: { status: ContentStatus }) {
  return <span className={`chip ${styles[status]}`}>{status}</span>;
}

export const PILLAR_STYLE: Record<string, string> = {
  People: 'bg-magenta text-white',
  Word: 'bg-plum-700 text-white',
  Events: 'bg-gold text-plum-950',
  Community: 'bg-plum-100 text-ink',
};
