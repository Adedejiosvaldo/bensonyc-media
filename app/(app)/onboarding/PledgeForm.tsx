'use client';
import { useFormState } from 'react-dom';
import { signPledge } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { PLEDGE_TEXT } from '@/content/rules';
import { Icon } from '@/components/Icon';

export function PledgeForm({ name, signedAt }: { name: string; signedAt: string | null }) {
  const [state, action] = useFormState(signPledge, null);
  const signed = signedAt || (state && !state.error);
  if (signed)
    return (
      <div className="flex items-center gap-4 rounded-[24px] bg-good/10 p-6 text-good-ink">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-good text-white"><Icon name="check" /></span>
        <div>
          <h2 className="card-title">Pledge signed</h2>
          <p className="text-sm text-ink/70">Signed by {name}{signedAt ? ` on ${new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.</p>
        </div>
      </div>
    );
  return (
    <form action={action} className="rounded-[24px] border-2 border-magenta/30 bg-card p-6">
      <p className="eyebrow mb-2">The pledge</p>
      <h2 className="card-title leading-tight">“{PLEDGE_TEXT}”</h2>
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" name="agree" className="mt-1 h-5 w-5 accent-[rgb(var(--magenta))]" />
        I agree, and I am willing to abide by the regulations of the unit.
      </label>
      <div className="mt-4">
        <label className="label" htmlFor="signature">Type your full name to sign</label>
        <input id="signature" name="signature" className="input font-semibold" placeholder={name} autoComplete="off" />
      </div>
      {state?.error && <p role="alert" className="alert-danger mt-3">{state.error}</p>}
      <SubmitButton className="btn-primary mt-5 w-full py-3" pendingText="Signing…">Sign the pledge</SubmitButton>
    </form>
  );
}
