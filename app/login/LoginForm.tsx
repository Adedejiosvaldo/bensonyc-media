'use client';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { sendMagicLink, signInWithPassword } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';

export function LoginForm({ next, startWithLink = false }: { next: string; startWithLink?: boolean }) {
  // Recruits have no password yet, so they start on the emailed-link form.
  const [mode, setMode] = useState<'password' | 'link'>(startWithLink ? 'link' : 'password');
  const [linkState, linkAction] = useFormState(sendMagicLink, null);
  const [pwState, pwAction] = useFormState(signInWithPassword, null);
  // Nobody using the emailed link has a password handy yet, so send them to set one —
  // unless they were bounced here from a specific page, which stays the priority.
  const linkNext = next === '/home' ? '/account' : next;

  if (mode === 'link' && linkState?.ok)
    return (
      <div role="status" className="alert-good block p-5">
        <Icon name="mail" className="mb-2 h-6 w-6" />
        <p className="font-bold">{linkState.message}</p>
        <p className="mt-1 text-sm font-normal text-ink/75">Open it on this phone or computer. The link works once and expires in an hour{linkNext === '/account' ? ' — it will take you to set a password' : ''}.</p>
      </div>
    );

  if (mode === 'password')
    return (
      <form action={pwAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" spellCheck={false} className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="input" />
        </div>
        {pwState && !pwState.ok && <p role="alert" className="alert-danger">{pwState.message}</p>}
        <SubmitButton className="btn-primary w-full py-3" pendingText="Signing in…">Sign in</SubmitButton>
        <p className="text-center text-xs text-muted">
          New here, or no password yet?{' '}
          <button type="button" onClick={() => setMode('link')} className="link min-h-9">
            Use the emailed link instead
          </button>
        </p>
      </form>
    );

  return (
    <form action={linkAction} className="space-y-4">
      <input type="hidden" name="next" value={linkNext} />
      <div>
        <label htmlFor="email-link" className="label">Email address</label>
        <input id="email-link" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" className="input" />
      </div>
      {linkState && !linkState.ok && <p role="alert" className="alert-danger">{linkState.message}</p>}
      <SubmitButton className="btn-primary w-full py-3" pendingText="Sending link…">Email me a sign-in link</SubmitButton>
      <p className="text-center text-xs text-muted">
        No password, or forgot it? We'll email you a one-time link, then take you to set a new one.{' '}
        <button type="button" onClick={() => setMode('password')} className="link min-h-9">
          Have a password? Sign in with it
        </button>
      </p>
    </form>
  );
}
