import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-8xl text-magenta">404</p>
      <p className="font-display text-3xl uppercase">This page isn’t on the roster</p>
      <Link href="/home" className="btn-primary">Back home</Link>
    </div>
  );
}
