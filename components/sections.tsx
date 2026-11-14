import Link from 'next/link';
import { COLORS, DO, DONT, SERIES, SIZES } from '@/content/brand';
import type { DepartmentGuide } from '@/content/departments';
import { RULES } from '@/content/rules';
import { RHYTHM } from '@/lib/plan';
import type { PlanMonth } from '@/lib/types';
import { label, todayLagos, monthStart, weekStart } from '@/lib/dates';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { PILLAR_STYLE } from './StatusChip';

function SectionTitle({ children, kicker }: { children: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-4">
      {kicker && <p className="kicker mb-1">{kicker}</p>}
      <h2 className="section-title sm:text-2xl">{children}</h2>
    </div>
  );
}

/* ───────────────────────────── Brand guide ───────────────────────────── */

export function BrandGuide() {
  return (
    <div className="space-y-12">
      {/* Hero specimen */}
      <section className="relative overflow-hidden rounded-[28px] bg-plum-700 p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-magenta/40 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <span className="chip bg-magenta text-white">Sunday in 60</span>
            <p className="mt-5 font-display text-5xl uppercase leading-[0.92] sm:text-7xl">
              Iron sharpens <span className="text-gold">iron</span>
            </p>
            <p className="mt-4 max-w-md text-base font-semibold text-white/80">Sunday · 8:00am · MFM Benson Youth Church, Ikorodu</p>
          </div>
          <div className="flex items-center gap-3">
            <Logo size={64} className="ring-2 ring-white/20" />
            <span className="text-sm font-semibold text-white/70">@mfmbensonyc</span>
          </div>
        </div>
        <p className="relative mt-8 text-xs uppercase tracking-[0.2em] text-white/50">This is what a YC graphic looks like</p>
      </section>

      <section>
        <SectionTitle kicker="60 / 30 / 10">Colour</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COLORS.map((c) => (
            <div key={c.name} className="card overflow-hidden">
              <div className="flex h-28 items-end p-3" style={{ background: c.hex }}>
                <span className={`font-mono text-xs font-bold ${c.text === 'light' ? 'text-white/90' : 'text-black/70'}`}>{c.hex}</span>
              </div>
              <div className="p-4">
                <p className="font-bold">{c.name}</p>
                <p className="mt-1 text-sm leading-snug text-muted">{c.use}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">60% plum ground · 30% white or cream · 10% magenta and gold accents. Never more than three brand colours on one graphic.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <p className="kicker mb-3">Display · Anton</p>
          <p className="font-display text-6xl uppercase leading-none">Citadel of Greatness</p>
          <p className="mt-4 text-sm text-muted">Headlines only. ALL CAPS, tight spacing, six words max.</p>
        </div>
        <div className="card p-6">
          <p className="kicker mb-3">Text · Plus Jakarta Sans</p>
          <p className="text-2xl font-extrabold">Sunday · 8:00am</p>
          <p className="mt-1 text-lg font-medium">MFM Benson Youth Church, Ikorodu</p>
          <p className="mt-4 text-sm text-muted">Dates, times, venues, captions. Bold (700) for info, extra bold (800) for burned-in reel captions. A script font is allowed for one event word only.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="card flex flex-col items-center justify-center gap-4 p-8">
          <div className="flex gap-4">
            <div className="rounded-2xl bg-white p-4"><Logo size={72} /></div>
            <div className="rounded-2xl bg-plum-700 p-4"><Logo size={72} /></div>
          </div>
          <p className="text-xs text-muted">Badge on white · Badge on plum</p>
        </div>
        <div className="card p-6">
          <SectionTitle kicker="The badge">Logo rules</SectionTitle>
          <ul className="grid gap-2 text-[15px] sm:grid-cols-2">
            {['Bottom-left of every graphic, 96px tall on a 1080px canvas', '64px clear space around it', 'Never stretch, recolour, outline or box it', '@mfmbensonyc beside it, small, white or muted'].map((t) => (
              <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionTitle kicker="Assets">Downloads</SectionTitle>
          <p className="text-sm text-muted">The logo file and the two brand fonts, to use in Canva, CapCut or anywhere else.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/logo.png" download className="btn-ghost"><Icon name="download" className="h-4 w-4" /> Logo (PNG)</a>
          <a href="https://fonts.google.com/specimen/Anton" target="_blank" rel="noopener noreferrer" className="btn-ghost"><Icon name="download" className="h-4 w-4" /> Anton (display)</a>
          <a href="https://fonts.google.com/specimen/Plus+Jakarta+Sans" target="_blank" rel="noopener noreferrer" className="btn-ghost"><Icon name="download" className="h-4 w-4" /> Plus Jakarta Sans (text)</a>
        </div>
      </section>

      <section>
        <SectionTitle kicker="Sizes">Templates</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-5 py-3">Post</th><th className="px-5 py-3">Size (px)</th><th className="px-5 py-3">Rule</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SIZES.map((s) => (
                <tr key={s.post}><td className="px-5 py-3 font-bold">{s.post}</td><td className="px-5 py-3 tabular-nums">{s.size}</td><td className="px-5 py-3 text-muted">{s.note}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SERIES.map((s) => <span key={s} className="chip bg-magenta text-white">{s}</span>)}
        </div>
        <p className="mt-2 text-sm text-muted">Series badges: magenta pill, white Plus Jakarta Sans 800. Names never change.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <p className="mb-3 font-display text-xl uppercase tracking-wide text-good-ink">Always</p>
          <ul className="space-y-2">{DO.map((t) => <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-good-ink" />{t}</li>)}</ul>
        </div>
        <div className="card p-6">
          <p className="mb-3 font-display text-xl uppercase tracking-wide text-accent">Never</p>
          <ul className="space-y-2">{DONT.map((t) => <li key={t} className="flex gap-2"><span className="mt-0.5 font-bold text-accent">×</span>{t}</li>)}</ul>
        </div>
      </section>

      <section className="card p-6">
        <SectionTitle kicker="Voice">How we sound</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="space-y-2 text-[15px]">
            <li><b>Short.</b> Headlines are six words or fewer.</li>
            <li><b>To one person.</b> “You”, not “all youths are hereby invited”.</li>
            <li><b>Rooted.</b> Teaching posts carry one verse with its reference.</li>
            <li><b>Warm.</b> Light Pidgin in captions is fine; doctrine stays plain English.</li>
            <li><b>One ask.</b> Come Sunday, share, save, tag or register.</li>
          </ul>
          <blockquote className="rounded-2xl bg-plum-100 p-5 text-[15px] leading-relaxed">
            You were not built to do life alone. 🔥<br />This Sunday at YC: “Iron Sharpens Iron”.<br />8am · Benson, Ikorodu. Tag the friend you’re bringing.
          </blockquote>
        </div>
      </section>

      <section className="card p-6">
        <SectionTitle kicker="Shooting">Photo & video</SectionTitle>
        <div className="grid gap-6 text-[15px] md:grid-cols-3">
          <ul className="space-y-1.5"><li className="font-bold">Shoot</li><li>Vertical first (9:16 video, 4:5 photo)</li><li>Faces and motion over posed rows</li><li>Face the light; never into stage lights</li><li>Sermon audio from the mixer</li></ul>
          <ul className="space-y-1.5"><li className="font-bold">Edit</li><li>Hook in 2 seconds</li><li>Captions: Jakarta 800, white on a plum pill</li><li>Warm, natural colour, no heavy filters</li><li>1-second end card with logo + handle</li></ul>
          <ul className="space-y-1.5"><li className="font-bold">Length</li><li>Sermon clips 30–60s</li><li>Spotlights 20–45s</li><li>Invites 15–20s</li><li>Ask before posting altar or emotional moments</li></ul>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────── Rules ───────────────────────────── */

export function RulesView() {
  const block = (title: string, items: string[], tone: string) => (
    <div className="card p-6">
      <p className={`mb-4 font-display text-xl uppercase tracking-wide ${tone}`}>{title}</p>
      <ul className="space-y-2.5">{items.map((t) => <li key={t} className="flex gap-2.5 text-[15px]"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t}</li>)}</ul>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[24px] bg-plum-900 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-6xl text-gold sm:text-7xl">7:30</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-white/60">arrive</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-6xl text-white/90 sm:text-7xl">8:00</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-white/60">grace ends</span>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-white/75">When service starts, go down to the church immediately.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {block('Time', RULES.time, 'text-ink')}
        {block('Conduct', RULES.conduct, 'text-ink')}
        {block('Ladies', RULES.ladies, 'text-accent')}
        {block('Men', RULES.men, 'text-plum-700 dark:text-ink')}
      </div>
    </div>
  );
}

/* ───────────────────────────── Department ───────────────────────────── */

export function DepartmentView({ dept }: { dept: DepartmentGuide }) {
  const col = (title: string, items: string[]) => (
    <div className="card p-5">
      <p className="kicker mb-3">{title}</p>
      <ul className="space-y-2">{items.map((t) => <li key={t} className="flex gap-2 text-[14.5px] leading-snug"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" />{t}</li>)}</ul>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <p className="text-lg leading-relaxed">{dept.mission}</p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {dept.responsibilities.map((r) => (
            <li key={r} className="flex gap-2.5 rounded-xl bg-plum-100/70 p-3 text-[14.5px] font-medium"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{r}</li>
          ))}
        </ul>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {col('Before service', dept.before)}
        {col('During service', dept.during)}
        {col('After service', dept.after)}
      </div>
      {dept.extra?.map((x) => (
        <div key={x.title} className="card p-6">
          <p className="mb-3 font-display text-xl uppercase tracking-wide">{x.title}</p>
          <ul className="grid gap-2 md:grid-cols-2">{x.items.map((t) => <li key={t} className="flex gap-2 text-[14.5px]"><Icon name="spark" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{t}</li>)}</ul>
        </div>
      ))}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-magenta/40 p-5 sm:flex-row sm:items-center">
        <span className="chip shrink-0 bg-magenta text-white">The standard</span>
        <p className="font-semibold">{dept.standard}</p>
      </div>
      {dept.needs && <p className="rounded-2xl bg-gold/15 p-4 text-sm font-semibold text-warn-ink">{dept.needs}</p>}
    </div>
  );
}

/* ───────────────────────────── 9-month plan ───────────────────────────── */

export function MasterPlan({ months, currentFollowers }: { months: PlanMonth[]; currentFollowers?: number | null }) {
  const now = monthStart(todayLagos());
  const max = 10000;
  const latest = currentFollowers ?? [...months].reverse().find((m) => m.followers_actual != null)?.followers_actual ?? 774;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-1">Goal</p>
            <p className="font-display text-5xl uppercase leading-none">10,000 by July 2027</p>
            <p className="mt-2 text-sm text-muted">Starting point: 774 followers on 1 Nov 2026. That means passing CCI Ikorodu (6,778) and Harvesters Ikorodu (9,486).</p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl tabular-nums text-accent">{latest.toLocaleString('en-US')}</p>
            <p className="text-xs uppercase tracking-wider text-muted">latest count</p>
          </div>
        </div>
        {/* Target staircase */}
        <div className="mt-8 flex h-40 items-end gap-1.5 sm:gap-3" role="img" aria-label="Monthly follower targets">
          {months.map((m) => {
            const h = Math.max(6, (m.follower_target / max) * 100);
            const actual = m.followers_actual ? Math.max(3, (m.followers_actual / max) * 100) : 0;
            const isNow = m.month === now;
            return (
              <div key={m.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className={`text-[11px] font-bold tabular-nums sm:text-xs ${isNow ? 'text-accent' : 'text-muted'}`}>{(m.follower_target / 1000).toFixed(m.follower_target < 10000 ? 1 : 0)}k</span>
                <div className={`relative w-full rounded-t-lg ${isNow ? 'bg-magenta' : 'bg-plum-100'}`} style={{ height: `${h}%` }}>
                  {actual > 0 && <div className="absolute inset-x-1 bottom-0 rounded-t-md bg-gold" style={{ height: `${(actual / h) * 100}%` }} title={`Actual ${m.followers_actual}`} />}
                </div>
                <span className={`text-[11px] font-semibold uppercase sm:text-xs ${isNow ? 'text-accent' : 'text-muted'}`}>{label(m.month, 'month').slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Bars: month-end target. Gold: actual count, once recorded in Admin. Highlighted: this month.</p>
      </div>

      <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-line sm:before:left-[23px]">
        {months.map((m, i) => {
          const isNow = m.month === now;
          const past = m.month < now;
          const firstWeek = weekStart(monthStart(m.month));
          return (
            <div key={m.id} className="relative flex gap-4">
              <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg sm:h-12 sm:w-12 ${isNow ? 'bg-magenta text-white' : past ? 'bg-plum-700 text-white' : 'border border-line bg-card text-muted'}`}>{i + 1}</div>
              <Link href={`/content?week=${firstWeek}`} className={`card group min-w-0 flex-1 p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-magenta/40 ${isNow ? 'ring-2 ring-magenta' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{label(m.month, 'month')}</p>
                  {isNow && <span className="chip bg-magenta text-white">Now</span>}
                  <span className="chip ml-auto bg-plum-100 text-plum-700 dark:text-ink">Target {m.follower_target.toLocaleString('en-US')}</span>
                </div>
                <h2 className="mt-1.5 card-title">{m.theme}</h2>
                <div className="mt-3 grid gap-3 text-[14.5px] md:grid-cols-2">
                  <p><span className="font-bold">Big moment: </span>{m.big_moment}</p>
                  <p><span className="font-bold">Hero content: </span>{m.hero_content}</p>
                </div>
                {m.highlight && <p className="mt-2 text-sm text-muted">Highlight to add: {m.highlight}</p>}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent">See this month's content board <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────── Weekly rhythm ───────────────────────────── */

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeeklyRhythm() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {RHYTHM.map((r) => (
        <div key={r.dow} className="card flex flex-col gap-2 p-4">
          <h2 className="card-title text-muted">{DOW[r.dow]}</h2>
          <span className={`chip w-fit ${PILLAR_STYLE[r.pillar]}`}>{r.pillar}</span>
          <p className="font-bold leading-tight">{r.series}</p>
          <p className="text-xs text-muted">{r.format}</p>
        </div>
      ))}
    </div>
  );
}
