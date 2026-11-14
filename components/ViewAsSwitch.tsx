'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { setViewAs } from '@/app/view-as-actions';
import { Icon } from './Icon';

const OPTIONS = [
  { value: '', label: 'Admin (you)' },
  { value: 'member', label: 'Member' },
  { value: 'social', label: 'Social team' },
  { value: 'head', label: 'Head' },
];
const NAMES: Record<string, string> = { member: 'a member', social: 'a Social team member', head: 'a head' };

function useBack() {
  const path = usePathname();
  const q = useSearchParams()?.toString();
  return `${path}${q ? `?${q}` : ''}`;
}

/** Sidebar control for real admins: preview the app as another kind of user. */
export function ViewAsSwitch({ current }: { current: string | null }) {
  const back = useBack();
  return (
    <form action={setViewAs} className="mt-3">
      <input type="hidden" name="back" value={back} />
      <label htmlFor="view-as" className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        <Icon name="eye" className="h-3.5 w-3.5" /> View as
      </label>
      <select
        id="view-as"
        name="as"
        defaultValue={current ?? ''}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="select-sm w-full"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}

/** Shown on every page while an admin previews, with a one-tap way back. */
export function ViewAsBanner({ current }: { current: string }) {
  const back = useBack();
  return (
    <div role="status" className="mb-6 flex flex-col gap-2 rounded-2xl border border-gold/60 bg-gold/15 p-3 text-sm sm:flex-row sm:items-center">
      <p className="flex flex-1 items-center gap-2">
        <Icon name="eye" className="h-4 w-4 shrink-0 text-warn-ink" />
        <span>
          <b>Previewing as {NAMES[current] ?? current}.</b> You see what they see; your admin access is unchanged.
        </span>
      </p>
      <form action={setViewAs}>
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="as" value="" />
        <button className="btn-ghost min-h-9 px-3 py-1.5 text-xs">Back to admin view</button>
      </form>
    </div>
  );
}
