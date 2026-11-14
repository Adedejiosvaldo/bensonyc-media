'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { Icon } from '@/components/Icon';

// Any workspace page that fails to load lands here instead of the framework's default error screen.
export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="card mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center sm:p-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <Icon name="alert" className="h-7 w-7" />
      </span>
      <h1 className="font-display text-3xl uppercase">This page didn’t load</h1>
      <p className="text-muted">
        It’s usually a weak connection. Try again; if it keeps happening, tell your unit head
        {error.digest ? <> and mention code <span className="font-mono text-ink">{error.digest}</span></> : null}.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <Link href="/home" className="btn-ghost">Go to Home</Link>
      </div>
    </div>
  );
}
