import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { CHURCH, FIRST_VISIT, SERIES_TILES } from '@/content/church';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, label, monthStart, todayLagos, weekStart } from '@/lib/dates';

export const metadata: Metadata = {
  title: { absolute: `${CHURCH.name} · Ikorodu` },
  description: `A youth church in ${CHURCH.area}. ${CHURCH.sunday.label} every Sunday at ${CHURCH.sunday.timeLabel}. Come as you are.`,
};
export const viewport: Viewport = { themeColor: '#1E0820' };
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

function nextSunday(today: string) {
  const isSunday = new Date(today + 'T00:00:00Z').getUTCDay() === 0;
  const lagosHour = new Date(Date.now() + 3_600_000).getUTCHours();
  const endHour = Number(CHURCH.sunday.end.split(':')[0]);
  return isSunday && lagosHour < endHour ? today : addDays(weekStart(today), 7);
}

export default async function ChurchPage() {
  const today = todayLagos();
  const sunday = nextSunday(today);
  const { months, posts } = await loadData(today);
  const instagram = `https://www.instagram.com/${CHURCH.instagram}/`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH.mapsQuery)}`;
  const mediaSite = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '') || '/';

  return (
    <div className="church-site">
      <a href="#main" className="church-skip">Skip to content</a>

      <header className="church-header">
        <nav className="church-nav" aria-label="Church website navigation">
          <Link href="/church" className="church-wordmark" aria-label="Benson Youth Church home">
            <Logo size={42} />
            <span>
              <strong className="church-wordmark__full">Benson Youth Church</strong>
              <strong className="church-wordmark__short">Benson YC</strong>
              <small>MFM · Ikorodu</small>
            </span>
          </Link>
          <div className="church-nav__links">
            <a href="#sunday">Sunday</a>
            <a href="#first">First visit</a>
            {months.length > 0 && <a href="#year">Year ahead</a>}
            <a href="#stories">Stories</a>
          </div>
          <Link href={mediaSite} className="church-nav__media">Media unit <Icon name="arrow" className="church-arrow" /></Link>
        </nav>
        <nav className="church-subnav" aria-label="Page sections">
          <a href="#sunday">Sunday</a>
          <a href="#first">First visit</a>
          {months.length > 0 && <a href="#year">Year ahead</a>}
          <a href="#stories">Stories</a>
        </nav>
      </header>

      <main id="main">
        <section className="church-arrival" id="sunday" aria-labelledby="church-title">
          <div className="church-arrival__masthead">
            <span>MOUNTAIN OF FIRE AND MIRACLES MINISTRIES</span>
            <span>{CHURCH.motto}</span>
          </div>
          <div className="church-arrival__welcome">
            <h1 id="church-title">Welcome to Benson.</h1>
            <p>A youth church in {CHURCH.area} where prayer is loud, worship is alive, and there’s room for you.</p>
          </div>

          <div className="church-route" aria-label="Plan a visit">
            <div className="church-route__step">
              <span className="church-route__direction">WHEN</span>
              <div><strong>{label(sunday, 'long')}</strong><span>{CHURCH.sunday.timeLabel} · {CHURCH.sunday.label}</span></div>
            </div>
            <div className="church-route__step">
              <span className="church-route__direction">WHERE</span>
              <div><strong>{CHURCH.area}</strong><span>Find the church on the map</span></div>
            </div>
            <div className="church-route__action">
              <a href={directions} target="_blank" rel="noreferrer" className="church-action church-action--gold">
                Get directions <Icon name="pin" className="church-arrow" />
              </a>
              <a href="/church/sunday.ics" className="church-action church-action--quiet">
                Add Sunday to calendar <Icon name="calendar" className="church-arrow" />
              </a>
            </div>
          </div>
          <a href="#first" className="church-arrival__next">First time here? See what to expect <Icon name="arrow" className="church-arrow" /></a>
        </section>

        <section className="church-first-visit" id="first" aria-labelledby="first-title">
          <div className="church-section-heading">
            <h2 id="first-title">Your first Sunday,<br />step by step.</h2>
            <p>Come as you are. We’ll help you find your way once you arrive.</p>
          </div>
          <ol className="church-welcome-path">
            {FIRST_VISIT.map((step, index) => (
              <li key={step.title}>
                <span className="church-welcome-path__index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {months.length > 0 && (
          <section className="church-year" id="year" aria-labelledby="year-title">
            <div className="church-section-heading church-section-heading--inverse">
              <h2 id="year-title">The months<br />ahead.</h2>
              <p>Church themes and moments to look forward to.</p>
            </div>
            <ol className="church-year-list">
              {months.map((month) => (
                <li key={month.month}>
                  <time dateTime={month.month}>{label(month.month, 'month')}</time>
                  <h3>{month.theme}</h3>
                  <p>{month.big_moment}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="church-stories" id="stories" aria-labelledby="stories-title">
          <div className="church-stories__heading">
            <div>
              <h2 id="stories-title">Life at Benson.</h2>
              <p>Keep up with the people, moments, and messages from our church.</p>
            </div>
            <a href={instagram} target="_blank" rel="noreferrer" className="church-text-link">Follow @{CHURCH.instagram} <Icon name="arrow" className="church-arrow" /></a>
          </div>
          {posts.length >= 3 ? (
            <div className="church-posts">
              {posts.map((post) => (
                <a key={post.remote_id} href={post.permalink ?? instagram} target="_blank" rel="noreferrer" className="church-post">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.thumbnail_url!} alt={post.caption?.slice(0, 100) ?? 'Recent Benson Youth Church post'} width="640" height="640" loading="lazy" />
                  {post.caption && <span>{post.caption.slice(0, 100)}</span>}
                </a>
              ))}
            </div>
          ) : (
            <ul className="church-series-list" aria-label="Weekly Instagram series">
              {SERIES_TILES.map((series) => <li key={series}>{series}</li>)}
            </ul>
          )}
        </section>

        <section className="church-next-sunday">
          <div>
            <h2>We’d love to see you.</h2>
            <span>{label(sunday, 'long')} · {CHURCH.sunday.timeLabel} · {CHURCH.area}</span>
          </div>
          <a href={directions} target="_blank" rel="noreferrer" className="church-action church-action--dark">
            Get directions <Icon name="pin" className="church-arrow" />
          </a>
        </section>
      </main>

      <footer className="church-footer">
        <Link href="/church" className="church-wordmark" aria-label="Benson Youth Church home">
          <Logo size={34} />
          <span><strong>{CHURCH.name}</strong><small>{CHURCH.area}</small></span>
        </Link>
        <span>Part of {CHURCH.parent}</span>
        <a href={mediaSite}>Explore the media unit <Icon name="arrow" className="church-arrow" /></a>
      </footer>
    </div>
  );
}
