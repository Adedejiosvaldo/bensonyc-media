import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Viewport } from 'next';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { CountUp } from '@/components/landing/CountUp';
import { CHURCH, FIRST_VISIT, SERIES_TILES } from '@/content/church';
import { DEPARTMENTS } from '@/content/departments';
import { LESSONS } from '@/content/lessons';
import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const viewport: Viewport = { themeColor: '#2B0A2C' };

const GOAL = 10_000;
const FALLBACK_FOLLOWERS = 774;

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

const WEEKLY_STORY = [
  { day: 'Sunday', title: 'Gather', detail: 'Worship, prayer and the Word — together in person.' },
  { day: 'Monday–Thursday', title: 'Carry it forward', detail: 'Sermon moments, stories and encouragement for everyday life.' },
  { day: 'Friday–Saturday', title: 'Make room', detail: 'Meet the community, catch up online and get ready for Sunday.' },
];

export default async function Landing() {
  const [{ user }, followers] = await Promise.all([getSession(), instagramFollowers()]);
  const mediaCta = user ? '/home' : '/join';
  const signInHref = user ? '/home' : '/login';
  const pct = Math.min(100, (followers / GOAL) * 100);
  const minutes = LESSONS.reduce((sum, lesson) => sum + lesson.minutes, 0);
  const instagram = `https://www.instagram.com/${CHURCH.instagram}/`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH.mapsQuery)}`;

  return (
    <div className="light-page">
      <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-plum-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <nav className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-5 px-4 sm:px-8" aria-label="Main navigation">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Benson Youth Church home">
            <Logo size={42} />
            <span className="leading-tight">
              <span className="block font-display text-base uppercase tracking-wide text-plum-900 sm:hidden">Benson YC</span>
              <span className="hidden font-display text-lg uppercase tracking-wide text-plum-900 sm:block">Benson Youth Church</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-muted sm:block">Church · Community · Media</span>
            </span>
          </Link>

          <div className="ml-auto hidden items-center gap-7 text-sm font-semibold text-muted lg:flex">
            <a href="#church" className="transition hover:text-magenta">Our church</a>
            <a href="#media" className="transition hover:text-magenta">Media ministry</a>
            <a href="#teams" className="transition hover:text-magenta">Teams</a>
            <a href="#stories" className="transition hover:text-magenta">Our stories</a>
          </div>
          <Link href={signInHref} className="btn ml-auto bg-plum-900 px-4 py-2.5 text-white hover:bg-plum-700 lg:ml-2">
            {user ? 'Open workspace' : <><span className="sm:hidden">Team sign in</span><span className="hidden sm:inline">Media team sign in</span></>}
          </Link>
        </nav>
        <nav className="flex gap-6 overflow-x-auto border-t border-line px-4 py-2.5 text-xs font-bold text-muted lg:hidden" aria-label="Page sections">
          <a href="#church" className="shrink-0 hover:text-magenta">Our church</a>
          <a href="#media" className="shrink-0 hover:text-magenta">Media ministry</a>
          <a href="#teams" className="shrink-0 hover:text-magenta">Teams</a>
          <a href="#stories" className="shrink-0 hover:text-magenta">Our stories</a>
        </nav>
      </header>

      <main id="main">
        <section className="relative isolate overflow-hidden bg-[#fffaf4]">
          <div className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-magenta/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14 lg:grid-cols-[1.08fr_.92fr] lg:gap-10 lg:py-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-plum-700/10 bg-white px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-plum-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-magenta" /> {CHURCH.name} · {CHURCH.area}
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-[clamp(3.4rem,8.4vw,7.5rem)] uppercase leading-[0.87] tracking-[-0.025em] text-plum-900">
                Faith for life.<br />A place to <span className="text-magenta">belong.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                Come worship with us, grow in community, and carry the message into your week. There’s a place for you here — in the room and behind the scenes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#visit" className="btn-primary px-6 py-3.5 text-sm sm:text-base">Plan a Sunday visit <Icon name="arrow" className="h-4 w-4" /></a>
                <a href="#media" className="btn-ghost px-6 py-3.5 text-sm sm:text-base">Explore the media team</a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-plum-900/10 pt-5 text-sm text-muted">
                <span className="inline-flex items-center gap-2"><Icon name="calendar" className="h-4 w-4 text-magenta" /> Sundays at {CHURCH.sunday.timeLabel}</span>
                <span className="inline-flex items-center gap-2"><Icon name="pin" className="h-4 w-4 text-magenta" /> {CHURCH.area}</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[540px]">
              <div className="absolute -inset-4 -rotate-3 rounded-[36px] bg-magenta/10" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[30px] bg-plum-900 p-5 text-white shadow-[0_30px_80px_-32px_rgba(43,10,44,.6)] sm:p-7">
                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-magenta/35 blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gold/15 blur-3xl" aria-hidden="true" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">A church for this generation</p>
                    <p className="mt-2 font-display text-3xl uppercase leading-none sm:text-4xl">Welcome<br />home.</p>
                  </div>
                  <Logo size={72} className="ring-4 ring-white/10 sm:h-20 sm:w-20" />
                </div>
                <div className="relative mt-6 rounded-2xl border border-white/15 bg-white/[0.08] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Join us this Sunday</p>
                      <p className="mt-2 font-display text-2xl uppercase">{CHURCH.sunday.label}</p>
                    </div>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-plum-900"><Icon name="calendar" className="h-6 w-6" /></span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
                    <div><p className="text-white/55">Time</p><p className="mt-1 font-bold">{CHURCH.sunday.timeLabel}</p></div>
                    <div><p className="text-white/55">Location</p><p className="mt-1 font-bold">{CHURCH.area}</p></div>
                  </div>
                </div>
                <div className="relative mt-4 flex items-center gap-3 text-sm text-white/75">
                  <span className="flex -space-x-2" aria-hidden="true">
                    <span className="h-8 w-8 rounded-full border-2 border-plum-900 bg-magenta" />
                    <span className="h-8 w-8 rounded-full border-2 border-plum-900 bg-gold" />
                    <span className="h-8 w-8 rounded-full border-2 border-plum-900 bg-white/80" />
                  </span>
                  <span>A community growing together in faith.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="church" className="scroll-mt-32 px-4 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
              <div>
                <p className="eyebrow mb-3">Church is more than a Sunday</p>
                <h2 className="max-w-xl font-display text-[clamp(2.8rem,6vw,5.2rem)] uppercase leading-[0.9] text-plum-900">Grow in faith.<br /><span className="text-magenta">Find your people.</span></h2>
              </div>
              <div className="lg:pb-2">
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                  We’re a youth church in {CHURCH.area}, part of {CHURCH.parent}. Come as you are for joyful worship, fire-filled prayer and a message grounded in real life.
                </p>
                <a href="#visit" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-magenta hover:text-plum-900">Your first Sunday, made easy <Icon name="arrow" className="h-4 w-4" /></a>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {FIRST_VISIT.map((step, index) => (
                <article key={step.title} className="group flex min-h-[180px] flex-col rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lift">
                  <span className="font-display text-4xl text-magenta/45">0{index + 1}</span>
                  <h3 className="mt-auto pt-5 font-display text-2xl uppercase leading-none text-plum-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="visit" className="scroll-mt-32 bg-[#fff3df] px-4 py-10 sm:px-8 sm:py-12">
          <div className="mx-auto grid max-w-7xl gap-5 rounded-[24px] border border-plum-900/5 bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="eyebrow mb-2">Your next step</p>
              <h2 className="font-display text-3xl uppercase text-plum-900 sm:text-4xl">We’ll save you a seat.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{CHURCH.sunday.label} every Sunday at {CHURCH.sunday.timeLabel}. Come a little early, bring a friend, and settle in.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH.mapsQuery)}`} target="_blank" rel="noreferrer" className="btn-primary px-5 py-3"><Icon name="pin" className="h-4 w-4" /> Get directions</a>
              <a href="/church/sunday.ics" className="btn-ghost px-5 py-3"><Icon name="calendar" className="h-4 w-4" /> Add to calendar</a>
            </div>
          </div>
        </section>

        <section id="media" className="scroll-mt-32 overflow-hidden bg-plum-900 px-4 py-14 text-white sm:px-8 sm:py-18">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/80"><Icon name="spark" className="h-4 w-4 text-gold" /> One church. One story, all week.</p>
              <h2 className="mt-6 max-w-3xl font-display text-[clamp(3rem,7vw,6.7rem)] uppercase leading-[0.88]">Sunday doesn’t<br />end at <span className="text-gold">noon.</span></h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">Our media team helps people experience the message beyond the service — capturing real moments, sharing helpful content and welcoming the next person through the door.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={mediaCta} className="btn-gold px-6 py-3.5 text-plum-950">{user ? 'Open the team workspace' : 'Join the media team'} <Icon name="arrow" className="h-4 w-4" /></Link>
                <a href={instagram} target="_blank" rel="noreferrer" className="btn border border-white/20 px-6 py-3.5 text-white hover:bg-white/10"><Icon name="instagram" className="h-4 w-4" /> Follow @{CHURCH.instagram}</a>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Our Instagram community</p>
                  <p className="mt-3 font-display text-6xl leading-none tabular-nums sm:text-7xl"><CountUp to={followers} /></p>
                  <p className="mt-2 text-sm text-white/60">people following along</p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-magenta text-white"><Icon name="instagram" className="h-6 w-6" /></span>
              </div>
              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-magenta to-gold" style={{ width: `${Math.max(pct, 1.5)}%` } as CSSProperties} /></div>
                <div className="mt-3 flex justify-between gap-3 text-xs font-semibold text-white/55"><span>Growing together</span><span className="text-gold">10,000 goal</span></div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">The week, in a few frames</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {SERIES_TILES.slice(0, 3).map((series, index) => (
                    <a key={series} href={instagram} target="_blank" rel="noreferrer" className={`flex aspect-[1.15] items-end rounded-xl p-3 transition hover:-translate-y-1 ${index === 1 ? 'bg-magenta' : index === 2 ? 'bg-[#fff3df] text-plum-900' : 'bg-plum-700'}`}>
                      <span className="font-display text-sm uppercase leading-tight sm:text-base">{series}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-8 sm:py-18">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div>
                <p className="eyebrow mb-3">A Sunday with the media team</p>
                <h2 className="font-display text-[clamp(2.8rem,6vw,5rem)] uppercase leading-[0.9] text-plum-900">Serve with<br />your <span className="text-magenta">gifts.</span></h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">You don’t need to know everything before you start. Learn with a team, find your strengths and help the moments that matter reach more people.</p>
            </div>
            <div id="teams" className="scroll-mt-32 mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {DEPARTMENTS.map((department, index) => (
                <article key={department.id} className="flex min-h-[160px] flex-col rounded-2xl border border-line bg-card p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lift">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-plum-100 text-magenta"><Icon name={department.id === 'projection' ? 'content' : department.id === 'photography' ? 'spark' : department.id === 'content' ? 'upload' : department.id === 'design' ? 'brand' : 'share'} className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-display text-xl uppercase leading-tight text-plum-900">{department.name}</h3>
                  <p className="mt-2 text-sm leading-5 text-muted">{department.tagline}</p>
                  <span className="mt-auto pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-magenta">Team 0{index + 1}</span>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl bg-[#fff3df] p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <p className="font-display text-2xl uppercase text-plum-900">Start with a few short lessons.</p>
                <p className="mt-1 text-sm text-muted">{LESSONS.length} lessons · about {minutes} minutes · pick up whenever you’re ready</p>
              </div>
              <Link href={mediaCta} className="btn bg-plum-900 px-5 py-3 text-white hover:bg-plum-700">{user ? 'Go to your workspace' : 'See how to join'} <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section id="stories" className="scroll-mt-32 border-y border-line bg-[#fbf8fb] px-4 py-14 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow mb-2">From Sunday into your week</p>
                <h2 className="font-display text-[clamp(2.8rem,6vw,4.8rem)] uppercase leading-[0.9] text-plum-900">The story keeps going.</h2>
              </div>
              <a href={instagram} target="_blank" rel="noreferrer" className="btn-ghost w-fit px-5 py-3"><Icon name="instagram" className="h-4 w-4" /> Follow @{CHURCH.instagram}</a>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {WEEKLY_STORY.map((item, index) => (
                <article key={item.day} className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-plum-900/5 sm:p-6">
                  <span className="absolute right-5 top-3 font-display text-6xl text-plum-100">0{index + 1}</span>
                  <p className="relative text-xs font-extrabold uppercase tracking-[0.15em] text-magenta">{item.day}</p>
                  <h3 className="relative mt-6 font-display text-2xl uppercase text-plum-900">{item.title}</h3>
                  <p className="relative mt-2 max-w-sm text-sm leading-6 text-muted">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#fff3df] px-4 py-14 text-center sm:px-8 sm:py-18">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-magenta/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl">
            <p className="eyebrow mb-3">MFM Benson Youth Church · {CHURCH.area}</p>
            <h2 className="font-display text-[clamp(3.4rem,10vw,7.5rem)] uppercase leading-[0.86] text-plum-900">There’s room<br />for <span className="text-magenta">you here.</span></h2>
            <p className="mt-5 text-base text-muted sm:text-lg">Sundays at {CHURCH.sunday.timeLabel} · {CHURCH.motto}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={directions} target="_blank" rel="noreferrer" className="btn-primary px-7 py-3.5 text-base"><Icon name="pin" className="h-4 w-4" /> Plan your visit</a>
              <Link href={mediaCta} className="btn-ghost px-7 py-3.5 text-base">{user ? 'Open media workspace' : 'Join the media team'} <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-muted sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3 text-plum-900">
            <Logo size={34} />
            <span><span className="block font-display uppercase">Benson Youth Church</span><span className="text-xs text-muted">A place to belong and a story to share.</span></span>
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            <a href="#church" className="hover:text-magenta">Our church</a>
            <a href="#media" className="hover:text-magenta">Media ministry</a>
            <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-magenta">Instagram</a>
            <Link href={signInHref} className="hover:text-magenta">Media team sign in</Link>
          </div>
          <p className="text-xs">Part of {CHURCH.parent}</p>
        </div>
      </footer>
    </div>
  );
}
