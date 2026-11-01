import Link from 'next/link';
import { requireMember, isLead } from '@/lib/auth';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'More' };

export default async function More() {
  const { member } = await requireMember();
  const links = [
    { href: '/plan', label: '9-month plan', icon: 'plan' },
    { href: '/departments', label: 'Departments', icon: 'team' },
    { href: '/brand', label: 'Brand guide', icon: 'brand' },
    { href: '/rules', label: 'Rules & pledge', icon: 'rules' },
    { href: '/account', label: 'Account', icon: 'user' },
    ...(isLead(member) ? [{ href: '/admin', label: 'Admin', icon: 'admin' }] : []),
  ];
  return (
    <div className="space-y-2">
      <h1 className="mb-6 font-display text-5xl uppercase">More</h1>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="card flex items-center gap-4 p-4 font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-plum-100 text-magenta"><Icon name={l.icon} /></span>
          {l.label}
          <Icon name="arrow" className="ml-auto h-4 w-4 text-muted" />
        </Link>
      ))}
      <form action="/auth/signout" method="post" className="pt-4">
        <button className="btn-ghost w-full"><Icon name="out" className="h-4 w-4" /> Sign out</button>
      </form>
    </div>
  );
}
