import type { ContentStatus } from '@/lib/types';

const styles: Record<ContentStatus, string> = {
  planned: 'bg-plum-100 text-plum-700 dark:text-ink',
  shot: 'bg-gold/20 text-warn',
  edited: 'bg-magenta/10 text-magenta',
  posted: 'bg-good/15 text-good',
  skipped: 'bg-line text-muted',
};

export function StatusChip({ status }: { status: ContentStatus }) {
  return <span className={`chip ${styles[status]}`}>{status}</span>;
}

export const PILLAR_STYLE: Record<string, string> = {
  People: 'bg-magenta text-white',
  Word: 'bg-plum-700 text-white',
  Events: 'bg-gold text-plum-950',
  Community: 'bg-plum-100 text-plum-700 dark:text-ink',
};
