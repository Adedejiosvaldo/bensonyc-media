'use client';
import { useFormState } from 'react-dom';
import { joinUnit } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';

type Dept = { id: string; name: string; short: string };

export function JoinForm({ departments, email, preselect }: { departments: Dept[]; email: string; preselect?: string }) {
  const [state, action] = useFormState(joinUnit, null);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="email">Signed in as</label>
        <input id="email" className="input media-input--readonly" value={email} readOnly aria-readonly="true" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" required className="input" placeholder="e.g. David Okafor" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp number</label>
          <input id="phone" name="phone" type="tel" className="input" placeholder="0803 000 0000" inputMode="tel" autoComplete="tel" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Your department</legend>
        <div className="media-choices">
          {departments.map((d) => (
            <label key={d.id} className="media-choice">
              <input type="radio" name="department_id" value={d.id} required defaultChecked={d.id === preselect} />
              <span>
                <strong>{d.name}</strong>
                <small>{d.short}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="alert-danger">{state.error}</p>}
      <SubmitButton className="btn-primary w-full" pendingText="Joining…">Join and start onboarding</SubmitButton>
    </form>
  );
}
