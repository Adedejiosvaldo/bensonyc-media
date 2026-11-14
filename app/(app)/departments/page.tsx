import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { DEPARTMENTS } from '@/content/departments';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import type { Member } from '@/lib/types';

export const metadata = { title: 'Departments' };

export default async function Departments() {
  const { supabase } = await requireMember();
  const { data: members } = await supabase.from('members').select('id, full_name, department_id, role, status').neq('status', 'inactive').order('full_name').returns<Member[]>();
  return (
    <div>
      <PageHeader eyebrow="Responsibilities" title="Departments">
        Five teams, one Sunday. Content, Design and Social carry this season’s growth push.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {DEPARTMENTS.map((d, i) => {
          const team = (members ?? []).filter((m) => m.department_id === d.id);
          const head = team.find((m) => m.role === 'head');
          return (
            <Link key={d.id} href={`/departments/${d.id}`} className={`card group flex flex-col p-6 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-magenta/40 ${d.focus ? 'md:last:col-span-2' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-5xl leading-none text-plum-100 dark:text-plum-700">0{i + 1}</span>
                {d.focus && <span className="chip bg-gold text-plum-950">Growth focus</span>}
              </div>
              <h2 className="mt-3 card-title text-xl">{d.name}</h2>
              <p className="mt-1 text-muted">{d.tagline}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {team.length === 0 && <span className="text-sm text-muted">No members listed yet</span>}
                {team.map((m) => (
                  <span key={m.id} className={`chip normal-case tracking-normal ${m.role === 'head' ? 'bg-plum-700 text-white' : m.status === 'on_break' ? 'bg-line text-muted' : 'bg-plum-100 text-ink'}`}>
                    {m.full_name}{m.role === 'head' ? ' · Head' : ''}{m.status === 'on_break' ? ' · on break' : ''}
                  </span>
                ))}
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-accent">Responsibilities <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              {!head && team.length > 0 && <span className="sr-only">No head assigned</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
