import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-plum-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-magenta/35 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3"><Logo size={48} /><span className="font-display text-2xl uppercase tracking-wide">Benson YC Media</span></Link>
        <p className="relative font-display text-7xl uppercase leading-[0.9]">Behind every <span className="text-gold">Sunday</span> is a team.</p>
        <p className="relative text-sm text-white/60">Citadel of Greatness · Ikorodu</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo size={44} /><span className="font-display text-xl uppercase">Benson YC Media</span></div>
          <p className="eyebrow mb-2">Media unit</p>
          <h1 className="font-display text-5xl uppercase leading-none">Sign in</h1>
          <p className="mb-8 mt-3 text-muted">New to the unit? Use your email here too. You will register right after.</p>
          {searchParams.error && <p className="mb-4 rounded-xl bg-magenta/10 p-3 text-sm font-semibold text-magenta">That link expired or was already used. Request a new one.</p>}
          <LoginForm next={searchParams.next ?? '/home'} />
        </div>
      </div>
    </div>
  );
}
