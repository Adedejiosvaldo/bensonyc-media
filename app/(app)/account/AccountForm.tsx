'use client';
import { useFormState } from 'react-dom';
import { setPassword } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';

export function AccountForm() {
  const [state, action] = useFormState(setPassword, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className="input" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Type it again" className="input" />
      </div>
      {state && (
        <p role={state.ok ? 'status' : 'alert'} className={state.ok ? 'alert-good' : 'alert-danger'}>{state.message}</p>
      )}
      <SubmitButton className="btn-primary w-full py-3" pendingText="Saving…">Save password</SubmitButton>
    </form>
  );
}
