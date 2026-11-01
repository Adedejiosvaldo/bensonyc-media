'use client';
import { useFormState } from 'react-dom';
import { sendMagicLink } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState(sendMagicLink, null);
  if (state?.ok)
    return (
      <div className="rounded-2xl bg-good/10 p-5 text-good">
        <Icon name="mail" className="mb-2 h-6 w-6" />
        <p className="font-bold">{state.message}</p>
        <p className="mt-1 text-sm text-ink/70">Open it on this phone or computer. The link works once and expires in an hour.</p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">Email address</label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" className="input" />
      </div>
      {state && !state.ok && <p className="text-sm font-semibold text-magenta">{state.message}</p>}
      <SubmitButton className="btn-primary w-full py-3" pendingText="Sending link…">Email me a sign-in link</SubmitButton>
      <p className="text-center text-xs text-muted">No password. We email you a one-time link.</p>
    </form>
  );
}
