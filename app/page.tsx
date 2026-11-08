import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/landing/Stage';
import { Timecode } from '@/components/landing/Timecode';
import { CountUp } from '@/components/landing/CountUp';
import { DEPARTMENTS } from '@/content/departments';
import { LESSONS } from '@/content/lessons';
import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const GOAL = 10_000;
const FALLBACK_FOLLOWERS = 774;

/** Latest Instagram follower count from the daily sync, if social accounts are connected. */
async function instagramFollowers() {
  try {
    const { data } = await createAdminClient()
      .from('social_account_stats')
      .select('followers')
      .eq('platform', 'instagram')
      .not('followers', 'is', null)
      .order('day', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.followers ?? FALLBACK_FOLLOWERS;
  } catch {
    return FALLBACK_FOLLOWERS;
  }
}

const STATEMENTS = ['One service.', 'Five departments.', 'Seven days of content.', 'Ten thousand people.'];

const SUNDAY = [
  { when: 'Before service', team: 'Projection', what: 'Screens, laptop and cameras tested. Lyrics loaded before the first song.' },
  { when: 'Pre-service', team: 'Photography', what: 'Faces at the door. Real people, not empty chairs.' },
  { when: 'During service', team: 'Social Media', what: 'Live stories so the people who stayed home still feel the room.' },
  { when: 'The sermon', team: 'Content', what: 'Recorded clean and clipped for Sunday in 60.' },
  { when: 'After service', team: 'Design', what: 'Face of the Week, next week’s flyers and reel covers.' },
  { when: 'All week', team: 'Everyone', what: 'YC Notes, Faces of YC, Friday Fire, See You Sunday. Then we do it again.' },
];

export default async function Landing() {
  const [{ user }, followers] = await Promise.all([getSession(), instagramFollowers()]);
  const cta = user ? '/home' : '/login';
  const pct = Math.min(100, (followers / GOAL) * 100);
  const minutes = LESSONS.reduce((s, l) => s + l.minutes, 0);

  return (
    <div className="landing bg-plum-950 text-white">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-plum-950/70 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} className="ring-1 ring-white/15" />
            <span className="font-display text-lg uppercase tracking-wide">Benson YC Media</span>
          </Link>
          <Link href={cta} className="btn bg-white px-4 py-2 text-plum-950 hover:bg-white/90">{user ? 'Open app' : 'Sign in'}</Link>
        </nav>
      </header>

      {/* 1 · Hero: a phone lying on the table stands up and fills the screen */}
      <Stage length={2.6} className="hero-stage">
        <div className="hero-glow" />
        <div className="hero-copy">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            <span className="rec-dot" /> MFM Benson Youth Church · Media Unit
          </p>
          <h1 className="font-display text-[clamp(3rem,9.5vw,8rem)] uppercase leading-[0.86] tracking-wide">
            Sunday doesn’t<br />end at <span className="text-magenta">noon.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base text-white/65 sm:text-lg">We carry it into every phone, all week. Scroll to see how.</p>
        </div>

        <div className="phone-wrap">
          <div className="phone">
            {[1, 2, 3, 4, 5, 6].map((i) => <span key={i} className="phone-edge" style={{ '--z': i } as CSSProperties} />)}
            <div className="phone-body">
              <div className="phone-screen">
                <div className="flex items-center justify-between px-4 pt-2 text-[10px] font-semibold text-white/80">
                  <span>9:41</span><span className="h-4 w-16 rounded-full bg-black" /><span>5G</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Logo size={26} />
                  <span className="text-[12px] font-bold">mfmbensonyc</span>
                  <span className="ml-auto text-white/50">•••</span>
                </div>
                <div className="post-art">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">This Sunday</span>
                  <span className="font-display text-[2.6rem] uppercase leading-[0.85]">Sunday<br />in 60</span>
                  <span className="mt-2 text-[11px] text-white/75">The whole message in one minute.</span>
                </div>
                <div className="flex items-center gap-3 px-3 pt-2.5 text-white/90">
                  <Icon name="heart" className="h-5 w-5 text-magenta" />
                  <Icon name="comment" className="h-5 w-5" />
                  <Icon name="send" className="h-5 w-5" />
                </div>
                <p className="px-3 pt-1.5 text-[11px] leading-snug text-white/80"><b>mfmbensonyc</b> Missed service? Here’s the word in 60 seconds. Share it with one person.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-end">
          <p className="font-display text-[clamp(2rem,5vw,3.75rem)] uppercase leading-none">Shot on Sunday.</p>
          <p className="font-display text-[clamp(2rem,5vw,3.75rem)] uppercase leading-none text-gold">Seen all week.</p>
        </div>
      </Stage>

      {/* 2 · Through the viewfinder */}
      <Stage length={3.4} className="vf-stage">
        <div className="vf-frame">
          {['tl', 'tr', 'bl', 'br'].map((c) => <span key={c} className={`vf-corner vf-${c}`} />)}
          <div className="vf-hud vf-top">
            <span className="flex items-center gap-2"><span className="rec-dot" /> REC</span>
            <span className="hidden sm:inline">ISO 800 · f/2.8 · 1/50</span>
            <span>4K · 25p</span>
          </div>
          <div className="vf-hud vf-bottom">
            <span className="font-mono tabular-nums"><Timecode /></span>
            <span className="vf-battery" aria-hidden="true" />
          </div>
          <div className="vf-cross" aria-hidden="true" />
          <div className="vf-lines">
            {STATEMENTS.map((s, i) => (
              <p
                key={s}
                className={`vf-line font-display uppercase ${i === 0 ? 'is-first' : ''} ${i === STATEMENTS.length - 1 ? 'is-last text-gold' : ''}`}
                style={{ '--i': i, '--n': STATEMENTS.length } as CSSProperties}
              >
                {s}
              </p>
            ))}
          </div>
        </div>
      </Stage>

      {/* 3 · Departments on a turning ring */}
      <Stage length={3.6} className="dept-stage">
        <div className="dept-head">
          <p className="eyebrow mb-2 text-gold">Five departments</p>
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] uppercase leading-none">Find your place.</h2>
        </div>
        <div className="dept-scene">
          <div className="dept">
            {DEPARTMENTS.map((d, i) => (
              <article key={d.id} className="dept-card" style={{ '--i': i, '--n': DEPARTMENTS.length } as CSSProperties}>
                <span className="font-display text-5xl text-magenta">0{i + 1}</span>
                <h3 className="mt-auto font-display text-[clamp(1.4rem,3vw,2.2rem)] uppercase leading-[0.95]">{d.name}</h3>
                <p className="mt-2 text-[13px] leading-snug text-white/70 sm:text-sm">{d.tagline}</p>
              </article>
            ))}
          </div>
        </div>
      </Stage>

      {/* 4 · The goal */}
      <section className="relative overflow-hidden px-4 py-28 text-center sm:px-8 sm:py-36">
        <div className="goal-glow" />
        <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/50">Instagram followers today</p>
        <p className="relative mt-3 font-display text-[clamp(5rem,20vw,13rem)] leading-none tabular-nums"><CountUp to={followers} /></p>
        <div className="relative mx-auto mt-8 max-w-xl">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="goal-bar h-full rounded-full bg-gradient-to-r from-magenta to-gold" style={{ width: `${Math.max(pct, 1.5)}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm text-white/55"><span>Today</span><span className="font-bold text-gold">10,000 by July 2027</span></div>
        </div>
        <p className="relative mx-auto mt-10 max-w-lg text-lg text-white/70">Every post, reel and story moves this number. Including the ones you’ll make.</p>
      </section>

      {/* 5 · A Sunday, sideways */}
      <Stage length={3.2} className="track-stage">
        <div className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-8 sm:pt-28">
          <p className="eyebrow mb-2 text-gold">Behind the lens</p>
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] uppercase leading-none">A Sunday with us.</h2>
        </div>
        <div className="track">
          {SUNDAY.map((s, i) => (
            <article key={s.when} className="track-card">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{s.when}</span>
                <span className="font-display text-3xl text-white/15">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <p className="mt-auto font-display text-3xl uppercase leading-none">{s.team}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{s.what}</p>
            </article>
          ))}
        </div>
        <div className="track-progress"><span /></div>
      </Stage>

      {/* 6 · Onboarding */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="eyebrow mb-2 text-gold">Before your first duty</p>
          <h2 className="font-display text-[clamp(2.4rem,5vw,4rem)] uppercase leading-none">{LESSONS.length} short lessons. About {minutes} minutes.</h2>
          <p className="mt-4 text-white/65">Finish the course and sign the pledge. Your progress saves, so you can stop and come back.</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {LESSONS.map((l, i) => (
            <li key={l.slug} className="reveal flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" style={{ '--d': i } as CSSProperties}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-magenta font-display">{i + 1}</span>
              <div>
                <p className="font-bold leading-tight">{l.title}</p>
                <p className="mt-1 text-sm text-white/55">{l.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 7 · Call to action */}
      <section className="relative overflow-hidden border-t border-white/[0.06] px-4 py-28 text-center sm:px-8">
        <div className="cta-glow" />
        <h2 className="relative font-display text-[clamp(3rem,10vw,8rem)] uppercase leading-[0.86]">Your seat is<br /><span className="text-magenta">behind the camera.</span></h2>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3">
          <Link href={cta} className="btn-primary px-8 py-4 text-base">{user ? 'Open the app' : 'Join the unit'} <Icon name="arrow" className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-white/45 sm:px-8">
        <div className="flex items-center gap-2"><Logo size={28} /> MFM Benson Youth Church · Ikorodu</div>
        <span>@mfmbensonyc</span>
      </footer>
    </div>
  );
}
