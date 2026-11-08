import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/landing/Stage';
import { Countdown } from '@/components/landing/Countdown';
import { CHURCH, FIRST_VISIT, SERIES_TILES } from '@/content/church';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, label, monthStart, todayLagos, weekStart } from '@/lib/dates';

export const metadata: Metadata = {
  title: { absolute: `${CHURCH.name} · Ikorodu` },
  description: `A youth church in ${CHURCH.area}. ${CHURCH.sunday.label} every Sunday at ${CHURCH.sunday.timeLabel}. Come as you are.`,
};
export const viewport: Viewport = { themeColor: '#ffffff' };
export const revalidate = 3600;

type Month = { month: string; theme: string; big_moment: string };
type Post = { remote_id: string; permalink: string | null; thumbnail_url: string | null; caption: string | null };

async function loadData(today: string) {
  try {
    const db = createAdminClient();
    const [{ data: months }, { data: posts }] = await Promise.all([
      db.from('plan_months').select('month, theme, big_moment').gte('month', monthStart(today)).order('month').limit(9),
      db.from('social_media_stats').select('remote_id, permalink, thumbnail_url, caption').eq('platform', 'instagram').not('thumbnail_url', 'is', null).order('posted_at', { ascending: false }).limit(6),
    ]);
    return { months: (months ?? []) as Month[], posts: (posts ?? []) as Post[] };
  } catch {
    return { months: [] as Month[], posts: [] as Post[] };
  }
}

/** The Sunday that's coming up (today, if it's Sunday and service hasn't finished). */
function nextSunday(today: string) {
  const isSunday = new Date(today + 'T00:00:00Z').getUTCDay() === 0;
  const lagosHour = new Date(Date.now() + 3_600_000).getUTCHours();
  const endHour = Number(CHURCH.sunday.end.split(':')[0]);
  return isSunday && lagosHour < endHour ? today : addDays(weekStart(today), 7);
}

const TONES: Record<string, { card: string; num: string; text: string }> = {
  plum: { card: 'bg-plum-700 text-white', num: 'text-gold', text: 'text-white/75' },
  cream: { card: 'cream text-ink', num: 'text-magenta', text: 'text-ink/70' },
  magenta: { card: 'bg-magenta text-white', num: 'text-white/70', text: 'text-white/85' },
  white: { card: 'border border-line bg-white text-ink', num: 'text-magenta', text: 'text-muted' },
};
const TILE_TONES = ['bg-plum-700 text-white', 'cream text-plum-900', 'bg-magenta text-white', 'cream text-plum-900', 'bg-plum-900 text-white', 'bg-plum-100 text-plum-900'];

export default async function ChurchPage() {
  const today = todayLagos();
  const sunday = nextSunday(today);
  const { months, posts } = await loadData(today);
  const ig = `https://www.instagram.com/${CHURCH.instagram}/`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH.mapsQuery)}`;
  const mediaUnit = `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')}/`;

  return (
    <div className="light-page">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-white/80 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-8">
          <Link href="/church" className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-lg uppercase tracking-wide">{CHURCH.short}</span>
          </Link>
          <div className="ml-auto hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <a href="#sunday" className="hover:text-ink">Sunday</a>
            <a href="#first" className="hover:text-ink">First visit</a>
            {months.length > 0 && <a href="#year" className="hover:text-ink">Year ahead</a>}
            <a href={ig} target="_blank" rel="noreferrer" className="hover:text-ink">Instagram</a>
          </div>
          <a href="#sunday" className="btn ml-auto bg-plum-900 px-4 py-2 text-white hover:bg-plum-700 md:ml-0">Plan a visit</a>
        </nav>
      </header>

      {/* 1 · The doors open as you scroll, and you walk through */}
      <Stage length={2.6} className="doors-stage">
        <div className="doors-copy">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-plum-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-plum-700">
            {CHURCH.name} · Ikorodu
          </p>
          <h1 className="font-display text-[clamp(3rem,9vw,6.25rem)] uppercase leading-[0.86] tracking-wide text-plum-900">
            The doors<br />are <span className="text-magenta">open.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-muted sm:text-lg">A youth church in Ikorodu where prayer is loud, worship is louder, and there’s room for you.</p>
        </div>

        <div className="doorway" aria-hidden="true">
          <div className="doorway-frame" />
          <div className="doorway-light" />
          <div className="doorway-doors">
            <span className="door door-l" />
            <span className="door door-r" />
          </div>
          <div className="doors-floor" />
        </div>

        <div className="doors-reveal">
          <p className="eyebrow mb-3">{CHURCH.motto}</p>
          <h2 className="font-display text-[clamp(4rem,14vw,10rem)] uppercase leading-[0.82] text-plum-900">Welcome<br /><span className="text-magenta">home.</span></h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted">Every Sunday · {CHURCH.sunday.timeLabel} · {CHURCH.area}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="#sunday" className="btn-primary px-7 py-3.5 text-base">Plan your visit <Icon name="arrow" className="h-4 w-4" /></a>
            <a href={ig} target="_blank" rel="noreferrer" className="btn-ghost px-7 py-3.5 text-base"><Icon name="instagram" className="h-4 w-4" /> @{CHURCH.instagram}</a>
          </div>
        </div>
      </Stage>

      {/* 2 · This Sunday, with a live countdown */}
      <section id="sunday" className="scroll-mt-20 px-4 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="relative overflow-hidden rounded-[32px] bg-plum-900 p-7 text-white sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-magenta/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-10 h-60 w-60 rounded-full bg-gold/20 blur-3xl" />
            <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-gold">This Sunday</p>
            <h2 className="relative mt-2 font-display text-[clamp(2.6rem,6vw,4.5rem)] uppercase leading-[0.9]">{label(sunday, 'long')}</h2>
            <div className="relative mt-8"><Countdown start={CHURCH.sunday.start} end={CHURCH.sunday.end} /></div>
          </div>

          <div className="card flex flex-col p-7">
            <p className="font-display text-3xl uppercase">Plan your visit</p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: 'clock', title: `${CHURCH.sunday.label}, ${CHURCH.sunday.timeLabel}`, sub: 'Come a little early and find a seat' },
                { icon: 'pin', title: CHURCH.area, sub: 'Tap “Get directions” for the map' },
                { icon: 'instagram', title: `@${CHURCH.instagram}`, sub: 'Questions? Send us a message' },
              ].map((r) => (
                <li key={r.icon} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-magenta"><Icon name={r.icon} className="h-5 w-5" /></span>
                  <div>
                    <p className="font-bold leading-tight">{r.title}</p>
                    <p className="text-sm text-muted">{r.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-auto grid gap-2 pt-7 sm:grid-cols-2">
              <a href={directions} target="_blank" rel="noreferrer" className="btn-primary py-3"><Icon name="pin" className="h-4 w-4" /> Get directions</a>
              <a href="/church/sunday.ics" className="btn-ghost py-3"><Icon name="calendar" className="h-4 w-4" /> Add to calendar</a>
              <a href={`https://ig.me/m/${CHURCH.instagram}`} target="_blank" rel="noreferrer" className="btn-ghost py-3 sm:col-span-2"><Icon name="instagram" className="h-4 w-4" /> Message us on Instagram</a>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · First visit: a deck of cards deals itself out */}
      <Stage length={2.4} id="first" className="deal-stage">
        <div className="deal-head">
          <p className="eyebrow mb-2">First time?</p>
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] uppercase leading-none text-plum-900">Here’s what happens.</h2>
        </div>
        <div className="deal">
          {FIRST_VISIT.map((c, i) => {
            const t = TONES[c.tone];
            return (
              <article
                key={c.title}
                className={`deal-card ${t.card}`}
                style={{ '--i': i, '--mx': (i % 2) - 0.5, '--my': Math.floor(i / 2) - 0.5, '--dx': i - (FIRST_VISIT.length - 1) / 2, '--r': [-7, 5, -3, 8][i % 4], zIndex: FIRST_VISIT.length - i } as CSSProperties}
              >
                <span className={`font-display text-4xl ${t.num}`}>0{i + 1}</span>
                <h3 className="mt-auto font-display text-[clamp(1.3rem,2.4vw,1.9rem)] uppercase leading-none">{c.title}</h3>
                <p className={`mt-2 text-[12px] leading-snug sm:text-sm ${t.text}`}>{c.text}</p>
              </article>
            );
          })}
        </div>
      </Stage>

      {/* 4 · The year ahead, from the unit's 9-month plan */}
      {months.length > 0 && (
        <Stage length={Math.max(2, months.length * 0.45)} id="year" className="flow-stage">
          <div className="flow-head">
            <p className="eyebrow mb-2">Mark your calendar</p>
            <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] uppercase leading-none text-plum-900">The year ahead.</h2>
          </div>
          <div className="flow">
            {months.map((m, i) => (
              <article key={m.month} className={`flow-card ${i === 0 ? 'is-now' : ''}`} style={{ '--i': i, '--n': months.length } as CSSProperties}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${i === 0 ? 'text-gold' : 'text-magenta'}`}>{label(m.month, 'month')}</p>
                  {i === 0 && <span className="chip bg-gold text-plum-950">This month</span>}
                </div>
                <h3 className="mt-3 font-display text-[clamp(2rem,4vw,2.6rem)] uppercase leading-[0.95]">{m.theme}</h3>
                <p className={`mt-auto text-sm leading-snug ${i === 0 ? 'text-white/80' : 'text-muted'}`}>{m.big_moment}</p>
              </article>
            ))}
          </div>
        </Stage>
      )}

      {/* 5 · All week on Instagram */}
      <section className="px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">All week long</p>
              <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] uppercase leading-none text-plum-900">Follow the story.</h2>
              <p className="mt-3 max-w-md text-muted">Sermon clips, faces from Sunday and something for your Friday. New every day.</p>
            </div>
            <a href={ig} target="_blank" rel="noreferrer" className="btn-primary px-6 py-3"><Icon name="instagram" className="h-4 w-4" /> Follow @{CHURCH.instagram}</a>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
            {posts.length >= 3
              ? posts.map((p) => (
                  <a key={p.remote_id} href={p.permalink ?? ig} target="_blank" rel="noreferrer" className="group aspect-square overflow-hidden rounded-2xl bg-plum-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbnail_url!} alt={p.caption?.slice(0, 80) ?? 'Instagram post'} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </a>
                ))
              : SERIES_TILES.map((s, i) => (
                  <a key={s} href={ig} target="_blank" rel="noreferrer" className={`flex aspect-square flex-col justify-end rounded-2xl p-3 transition hover:-translate-y-1 sm:p-5 ${TILE_TONES[i % TILE_TONES.length]}`}>
                    <span className="font-display text-[clamp(1.1rem,3.4vw,2.4rem)] uppercase leading-[0.9]">{s}</span>
                  </a>
                ))}
          </div>
        </div>
      </section>

      {/* 6 · Serve */}
      <section className="px-4 sm:px-8">
        <div className="cream mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-[32px] p-8 sm:flex-row sm:items-center sm:p-12">
          <div className="flex-1">
            <p className="eyebrow mb-2">Want to serve?</p>
            <p className="font-display text-[clamp(1.9rem,4vw,3rem)] uppercase leading-[0.95] text-plum-900">Behind every Sunday is a team with cameras, laptops and phones.</p>
          </div>
          <a href={mediaUnit} className="btn bg-plum-900 px-6 py-3 text-white hover:bg-plum-700">Join the media unit <Icon name="arrow" className="h-4 w-4" /></a>
        </div>
      </section>

      {/* 7 · See you Sunday */}
      <section className="relative overflow-hidden px-4 py-28 text-center sm:px-8">
        <div className="soft-glow" />
        <h2 className="relative font-display text-[clamp(3.4rem,12vw,9rem)] uppercase leading-[0.84] text-plum-900">See you<br /><span className="text-magenta">Sunday.</span></h2>
        <p className="relative mt-5 text-lg text-muted">{label(sunday, 'long')} · {CHURCH.sunday.timeLabel}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <a href={directions} target="_blank" rel="noreferrer" className="btn-primary px-8 py-4 text-base"><Icon name="pin" className="h-4 w-4" /> Get directions</a>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted sm:px-8">
          <div className="flex items-center gap-2"><Logo size={28} /> {CHURCH.name} · Ikorodu</div>
          <span>Part of {CHURCH.parent}</span>
          <a href={ig} target="_blank" rel="noreferrer" className="font-semibold hover:text-ink">@{CHURCH.instagram}</a>
        </div>
      </footer>
    </div>
  );
}
