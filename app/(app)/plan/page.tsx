import Link from 'next/link';
import { requireMember, isAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { MasterPlan } from '@/components/sections';
import type { PlanMonth } from '@/lib/types';

export const metadata = { title: '9-month plan' };

export default async function PlanPage() {
  const { supabase, member } = await requireMember();
  const { data: months } = await supabase.from('plan_months').select('*').order('month').returns<PlanMonth[]>();
  return (
    <div>
      <PageHeader
        eyebrow="Nov 2026 – Jul 2027"
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
