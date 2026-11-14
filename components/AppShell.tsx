'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { Icon } from './Icon';

type NavItem = { href: string; label: string; icon: string; lead?: boolean; group: string };

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: 'home', group: 'Your week' },
  { href: '/content', label: 'This week', icon: 'content', group: 'Your week' },
  { href: '/roster', label: 'Roster', icon: 'roster', group: 'Your week' },
  { href: '/availability', label: 'Availability', icon: 'calendar', group: 'Your week' },
  { href: '/social', label: 'Post', icon: 'upload', group: 'Social' },
  { href: '/insights', label: 'Insights', icon: 'chart', group: 'Social' },
  { href: '/plan', label: '9-month plan', icon: 'plan', group: 'Plan' },
  { href: '/departments', label: 'Departments', icon: 'team', group: 'Plan' },
  { href: '/onboarding', label: 'Onboarding', icon: 'course', group: 'Learn' },
  { href: '/brand', label: 'Brand guide', icon: 'brand', group: 'Learn' },
  { href: '/rules', label: 'Rules', icon: 'rules', group: 'Learn' },
  { href: '/admin', label: 'Admin', icon: 'admin', lead: true, group: 'Admin' },
];

const MORE: NavItem = { href: '/more', label: 'More', icon: 'more', group: '' };

export function AppShell({ name, role, onboarded, children }: { name: string; role: string; onboarded: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const lead = role === 'admin' || role === 'head';
  const items = NAV.filter((n) => !n.lead || lead);
  const active = (href: string) => path === href || path.startsWith(href + '/');
  const groups: { name: string; items: NavItem[] }[] = [];
  for (const n of items) {
    const g = groups.at(-1);
    if (g?.name === n.group) g.items.push(n);
    else groups.push({ name: n.group, items: [n] });
  }

  // Phone tab bar: onboarding holds the second slot until it's done, then Post takes it.
  const mobile = ['/home', onboarded ? '/social' : '/onboarding', '/content', '/roster']
    .map((href) => NAV.find((n) => n.href === href)!)
    .concat(MORE);
  const inMore = !mobile.slice(0, 4).some((m) => active(m.href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#main" className="sr-only z-50 rounded-lg bg-card px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card text-ink lg:flex">
        <Link href="/home" className="flex items-center gap-3 px-6 pb-5 pt-6">
          <Logo size={42} />
          <span className="leading-tight">
            <span className="block font-display text-xl uppercase tracking-wide text-plum-900">Benson YC</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Media unit</span>
          </span>
        </Link>
        <nav className="sidebar-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 pb-3" aria-label="Main">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{g.name}</p>
              <ul className="space-y-0.5">
                {g.items.map((n) => {
                  const on = active(n.href);
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        aria-current={on ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                          on ? 'bg-plum-100 text-plum-900' : 'text-ink/75 hover:bg-plum-100/60 hover:text-ink'
                        }`}
                      >
                        <Icon name={n.icon} className={`h-[18px] w-[18px] ${on ? 'text-magenta' : ''}`} />
                        {n.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="m-3 rounded-2xl border border-line bg-surface p-4">
          <p className="truncate text-sm font-bold" title={name}>{name}</p>
          <p className="text-xs capitalize text-muted">{role}</p>
          <div className="mt-2 flex items-center gap-1">
            <Link
              href="/account"
              aria-current={active('/account') ? 'page' : undefined}
              className="-ml-2 flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-plum-100 hover:text-ink"
            >
              <Icon name="user" className="h-4 w-4" /> Account
            </Link>
            <form action="/auth/signout" method="post">
              <button className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-plum-100 hover:text-ink">
                <Icon name="out" className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-card/95 px-4 pb-2.5 text-ink backdrop-blur lg:hidden"
        style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
      >
        <Link href="/home" className="flex min-h-11 items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-lg uppercase tracking-wide text-plum-900">Benson YC Media</span>
        </Link>
        <Link href="/account" aria-label="Your account" className="flex h-11 w-11 items-center justify-center rounded-full bg-plum-100 text-plum-900">
          <Icon name="user" className="h-5 w-5" />
        </Link>
      </header>

      <main id="main" className="min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-16 lg:pt-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Quick"
      >
        {mobile.map((item) => {
          const on = item.href === '/more' ? inMore : active(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? 'text-accent' : 'text-muted'}`}
            >
              {on && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-magenta" aria-hidden="true" />}
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
