import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { updatePlanMonth } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { HERO_FORMATS } from '@/content/brand';
import { label } from '@/lib/dates';
import type { PlanMonth } from '@/lib/types';

export const metadata = { title: 'Edit plan' };

export default async function EditPlan() {
  const { supabase } = await requireAdmin();
  const { data: months } = await supabase.from('plan_months').select('*').order('month').returns<PlanMonth[]>();
  return (
    <div>
      <Link href="/plan" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-magenta"><Icon name="back" className="h-4 w-4" /> 9-month plan</Link>
      <PageHeader eyebrow="Admin" title="Edit the plan">Changes flow into every weekly board you generate after saving. Record the real follower count at each month end.</PageHeader>
      <div className="space-y-4">
        {(months ?? []).map((m) => (
          <form key={m.id} action={updatePlanMonth} className="card grid gap-4 p-5 md:grid-cols-2">
            <input type="hidden" name="id" value={m.id} />
            <p className="font-display text-2xl uppercase md:col-span-2">{label(m.month, 'month')}</p>
            <div><label className="label" htmlFor={`theme-${m.id}`}>Theme</label><input id={`theme-${m.id}`} name="theme" defaultValue={m.theme} className="input" /></div>
            <div><label className="label" htmlFor={`moment-${m.id}`}>Big moment</label><input id={`moment-${m.id}`} name="big_moment" defaultValue={m.big_moment} className="input" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor={`hero-${m.id}`}>Hero content</label><textarea id={`hero-${m.id}`} name="hero_content" defaultValue={m.hero_content} rows={2} className="input" /></div>
            <div>
              <label className="label" htmlFor={`format-${m.id}`}>Format</label>
              <select id={`format-${m.id}`} name="hero_format" defaultValue={m.hero_format} className="input">
                {HERO_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor={`target-${m.id}`}>Follower target</label><input id={`target-${m.id}`} name="follower_target" type="number" defaultValue={m.follower_target} className="input tabular-nums" /></div>
            <div><label className="label" htmlFor={`actual-${m.id}`}>Actual followers at month end</label><input id={`actual-${m.id}`} name="followers_actual" type="number" defaultValue={m.followers_actual ?? ''} className="input tabular-nums" placeholder="Fill in on the 1st" /></div>
            <div className="md:col-span-2"><SubmitButton>Save {label(m.month, 'month')}</SubmitButton></div>
          </form>
        ))}
      </div>
    </div>
  );
}
