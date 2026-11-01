'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { Icon } from './Icon';

type NavItem = { href: string; label: string; icon: string; lead?: boolean; admin?: boolean };

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/onboarding', label: 'Onboarding', icon: 'course' },
  { href: '/content', label: 'This week', icon: 'content' },
  { href: '/roster', label: 'Roster', icon: 'roster' },
  { href: '/plan', label: '9-month plan', icon: 'plan' },
  { href: '/departments', label: 'Departments', icon: 'team' },
  { href: '/brand', label: 'Brand guide', icon: 'brand' },
  { href: '/rules', label: 'Rules', icon: 'rules' },
  { href: '/admin', label: 'Admin', icon: 'admin', lead: true },
];

const MOBILE = ['/home', '/onboarding', '/content', '/roster', '/more'];

export function AppShell({ name, role, children }: { name: string; role: string; children: React.ReactNode }) {
  const path = usePathname();
  const lead = role === 'admin' || role === 'head';
  const items = NAV.filter((n) => !n.lead || lead);
  const active = (href: string) => path === href || path.startsWith(href + '/');

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-plum-900 text-white lg:flex">
        <div className="flex items-center gap-3 px-6 pb-6 pt-7">
          <Logo size={44} className="ring-2 ring-white/15" />
          <div className="leading-tight">
            <p className="font-display text-xl uppercase tracking-wide">Benson YC</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Media Unit</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition ${
                active(n.href) ? 'bg-white text-plum-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon name={n.icon} className={`h-[18px] w-[18px] ${active(n.href) ? 'text-magenta' : ''}`} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-2xl bg-white/[0.06] p-4">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-xs capitalize text-white/50">{role}</p>
          <div className="mt-3 flex items-center gap-4">
            <Link href="/account" className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white">
              <Icon name="user" className="h-4 w-4" /> Account
            </Link>
            <form action="/auth/signout" method="post">
              <button className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white">
                <Icon name="out" className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-plum-900 px-4 py-3 text-white lg:hidden" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <Link href="/home" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display text-lg uppercase tracking-wide">Benson YC Media</span>
        </Link>
      </div>

      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-16 lg:pt-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Quick"
      >
        {MOBILE.map((href) => {
          const item = href === '/more' ? { href, label: 'More', icon: 'spark' } : NAV.find((n) => n.href === href)!;
          const on = href === '/more' ? path === '/more' : active(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${on ? 'text-magenta' : 'text-muted'}`}>
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
