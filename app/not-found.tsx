import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-8xl text-accent" aria-hidden="true">404</p>
      <h1 className="font-display text-3xl uppercase">This page isn’t on the roster</h1>
      <p className="max-w-sm text-muted">The link may be old or mistyped.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">Go to the media site</Link>
        <Link href="/home" className="btn-ghost">Open the team workspace</Link>
      </div>
    </main>
  );
}
