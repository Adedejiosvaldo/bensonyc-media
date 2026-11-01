'use client';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { sendMagicLink, signInWithPassword } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [linkState, linkAction] = useFormState(sendMagicLink, null);
  const [pwState, pwAction] = useFormState(signInWithPassword, null);

  if (mode === 'link' && linkState?.ok)
    return (
      <div className="rounded-2xl bg-good/10 p-5 text-good">
        <Icon name="mail" className="mb-2 h-6 w-6" />
        <p className="font-bold">{linkState.message}</p>
        <p className="mt-1 text-sm text-ink/70">Open it on this phone or computer. The link works once and expires in an hour.</p>
      </div>
    );

  if (mode === 'password')
    return (
      <form action={pwAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="input" />
        </div>
        {pwState && !pwState.ok && <p className="text-sm font-semibold text-magenta">{pwState.message}</p>}
        <SubmitButton className="btn-primary w-full py-3" pendingText="Signing in…">Sign in</SubmitButton>
        <p className="text-center text-xs text-muted">
          New here, or no password yet?{' '}
          <button type="button" onClick={() => setMode('link')} className="font-semibold text-magenta underline-offset-2 hover:underline">
            Use the emailed link instead
          </button>
        </p>
      </form>
    );

  return (
    <form action={linkAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email-link" className="label">Email address</label>
        <input id="email-link" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" className="input" />
      </div>
      {linkState && !linkState.ok && <p className="text-sm font-semibold text-magenta">{linkState.message}</p>}
      <SubmitButton className="btn-primary w-full py-3" pendingText="Sending link…">Email me a sign-in link</SubmitButton>
      <p className="text-center text-xs text-muted">
        No password. We email you a one-time link.{' '}
        <button type="button" onClick={() => setMode('password')} className="font-semibold text-magenta underline-offset-2 hover:underline">
          Have a password? Sign in with it
        </button>
      </p>
    </form>
  );
}
