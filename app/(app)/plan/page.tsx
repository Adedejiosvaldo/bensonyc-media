import Link from 'next/link';
import { requireMember, isAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { MasterPlan } from '@/components/sections';
import type { PlanMonth } from '@/lib/types';

export const metadata = { title: '9-month plan' };

const monthName = (iso: string) => new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

export default async function PlanPage() {
  const { supabase, member } = await requireMember();
  const { data: months } = await supabase.from('plan_months').select('*').order('month').returns<PlanMonth[]>();
  const list = months ?? [];
  const span = list.length ? `${monthName(list[0].month)} – ${monthName(list[list.length - 1].month)}` : 'The plan';
  return (
    <div>
      <PageHeader
        eyebrow={span}
        title="The 9-month plan"
        actions={
          <>
            <Link href="/content" className="btn-primary">This week’s content</Link>
            {isAdmin(member) && <Link href="/admin/plan" className="btn-ghost">Edit plan</Link>}
          </>
        }
      >
        One theme and one big moment each month. Every weekly content board is built from the month it falls in.
      </PageHeader>
      <MasterPlan months={months ?? []} />
    </div>
  );
}
