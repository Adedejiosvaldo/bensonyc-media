'use client';
import { useFormState } from 'react-dom';
import { joinUnit } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';

type Dept = { id: string; name: string; short: string };

export function JoinForm({ departments, email }: { departments: Dept[]; email: string }) {
  const [state, action] = useFormState(joinUnit, null);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input opacity-70" value={email} disabled />
      </div>
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required className="input" placeholder="e.g. David Okafor" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="phone">WhatsApp number</label>
        <input id="phone" name="phone" className="input" placeholder="0803 000 0000" inputMode="tel" autoComplete="tel" />
      </div>
      <fieldset>
        <legend className="label">Your department</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {departments.map((d) => (
            <label key={d.id} className="flex cursor-pointer gap-3 rounded-2xl border border-line bg-card p-4 transition has-[:checked]:border-magenta has-[:checked]:ring-4 has-[:checked]:ring-magenta/10">
              <input type="radio" name="department_id" value={d.id} required className="mt-1 accent-[rgb(var(--magenta))]" />
              <span>
                <span className="block font-bold">{d.name}</span>
                <span className="block text-sm text-muted">{d.short}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p className="rounded-xl bg-magenta/10 p-3 text-sm font-semibold text-magenta">{state.error}</p>}
      <SubmitButton className="btn-primary w-full py-3.5" pendingText="Joining…">Join the unit and start onboarding</SubmitButton>
    </form>
  );
}
