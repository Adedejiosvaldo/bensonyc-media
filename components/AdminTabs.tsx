import Link from 'next/link';
import { Icon } from './Icon';

const TABS = [
  { href: '/admin', label: 'Members', icon: 'team' },
  { href: '/admin/accounts', label: 'Connected accounts', icon: 'share' },
  { href: '/admin/ai', label: 'AI ideas', icon: 'spark' },
  { href: '/admin/plan', label: '9-month plan', icon: 'plan' },
] as const;

/** Everything only admins manage lives under these tabs. */
export function AdminTabs({ current }: { current: (typeof TABS)[number]['href'] }) {
  return (
    <nav aria-label="Admin sections" className="-mt-4 mb-8 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((t) => {
        const on = t.href === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors duration-150 ${
              on ? 'border-magenta text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
