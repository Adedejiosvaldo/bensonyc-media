import Link from 'next/link';
import { requireMember, isLead } from '@/lib/auth';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'More' };

export default async function More() {
  const { member } = await requireMember();
  const groups = [
    {
      name: 'Social',
      links: [
        { href: '/social', label: 'Post to Instagram & TikTok', icon: 'upload' },
        { href: '/insights', label: 'Social insights', icon: 'chart' },
      ],
    },
    {
      name: 'Plan & learn',
      links: [
        { href: '/availability', label: 'Availability & calendar', icon: 'calendar' },
        { href: '/plan', label: '9-month plan', icon: 'plan' },
        { href: '/departments', label: 'Departments', icon: 'team' },
        { href: '/onboarding', label: 'Onboarding lessons', icon: 'course' },
        { href: '/brand', label: 'Brand guide', icon: 'brand' },
        { href: '/rules', label: 'Rules & pledge', icon: 'rules' },
      ],
    },
    {
      name: 'You',
      links: [
        { href: '/account', label: 'Account', icon: 'user' },
        ...(isLead(member) ? [{ href: '/admin', label: 'Admin', icon: 'admin' }] : []),
      ],
    },
  ];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl uppercase">More</h1>
      {groups.map((g) => (
        <section key={g.name} aria-labelledby={`more-${g.name}`}>
          <h2 id={`more-${g.name}`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">{g.name}</h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {g.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-14 items-center gap-4 px-4 py-3 font-bold transition-colors duration-150 hover:bg-plum-100/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-accent"><Icon name={l.icon} /></span>
                  {l.label}
                  <Icon name="arrow" className="ml-auto h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <form action="/auth/signout" method="post">
        <button className="btn-ghost w-full"><Icon name="out" className="h-4 w-4" /> Sign out</button>
      </form>
    </div>
  );
}
