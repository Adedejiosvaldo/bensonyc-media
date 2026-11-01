import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { DEPARTMENTS } from '@/content/departments';
import { LESSONS } from '@/content/lessons';
import { getSession } from '@/lib/auth';

export default async function Landing() {
  const { user } = await getSession();
  const cta = user ? '/home' : '/login';

  return (
    <div className="min-h-dvh bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden bg-plum-900 text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-magenta/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 left-1/3 h-[24rem] w-[24rem] rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8" style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}>
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size={44} className="ring-2 ring-white/15" />
              <span className="font-display text-xl uppercase tracking-wide">Benson YC Media</span>
            </div>
            <Link href={cta} className="btn border border-white/20 text-white hover:bg-white/10">{user ? 'Open app' : 'Sign in'}</Link>
          </nav>

          <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-white/50" /> Citadel of Greatness
              </p>
              <h1 className="font-display text-[clamp(3.2rem,10vw,7.5rem)] uppercase leading-[0.88] tracking-wide">
                The team behind <span className="text-magenta">every</span> Sunday.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
                MFM Benson Youth Church's media unit. See your Sunday duty, sign the pledge, and this week's content.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={cta} className="btn-primary px-7 py-3.5 text-base">Join the unit <Icon name="arrow" className="h-4 w-4" /></Link>
                <a href="#how" className="btn border border-white/20 px-7 py-3.5 text-base text-white hover:bg-white/10">How it works</a>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">The goal</p>
              <p className="mt-2 font-display text-7xl leading-none text-gold">10,000</p>
              <p className="mt-1 text-white/70">Instagram followers by July 2027</p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[8%] rounded-full bg-magenta" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/50"><span>774 today</span><span>10k</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <p className="eyebrow mb-2">Five departments</p>
        <h2 className="font-display text-4xl uppercase sm:text-5xl">Find your place</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DEPARTMENTS.map((d, i) => (
            <div key={d.id} className="card flex flex-col p-5">
              <span className="font-display text-4xl text-plum-100 dark:text-plum-700">0{i + 1}</span>
              <p className="mt-2 text-lg font-extrabold leading-tight">{d.name}</p>
              <p className="mt-2 text-sm leading-snug text-muted">{d.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-4xl uppercase sm:text-5xl">{LESSONS.length} short lessons. About 25 minutes.</h2>
            <p className="mt-4 text-muted">Every member finishes the course and signs the pledge before their first duty. Your progress is saved, so you can stop and come back.</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {LESSONS.map((l, i) => (
              <li key={l.slug} className="flex gap-4 rounded-2xl border border-line p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum-700 font-display text-white">{i + 1}</span>
                <div>
                  <p className="font-bold leading-tight">{l.title}</p>
                  <p className="mt-1 text-sm text-muted">{l.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted sm:px-8">
        <div className="flex items-center gap-2"><Logo size={28} /> MFM Benson Youth Church · Ikorodu</div>
        <span>@mfmbensonyc</span>
      </footer>
    </div>
  );
}
