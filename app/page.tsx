import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { CHURCH } from '@/content/church';
import { DEPARTMENTS } from '@/content/departments';
import { SERIES } from '@/content/brand';
import { LESSONS } from '@/content/lessons';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: { absolute: 'Benson YC Media · The crew behind Sunday' },
  description: 'Meet the MFM Benson Youth Church media departments, find where your skills fit, and join the team.',
};
export const viewport: Viewport = { themeColor: '#FFF3DF' };

const RUN_OF_SHOW = [
  {
    mark: 'PREP',
    title: 'Ready the room',
    detail: 'Projection checks the screens and lyrics. Cameras, batteries, and sound are tested before service.',
  },
  {
    mark: 'CAPTURE',
    title: 'Keep the moment',
    detail: 'Photography and Content capture worship, the message, and the people in the room.',
  },
  {
    mark: 'RELEASE',
    title: 'Carry it through the week',
    detail: 'Editing, Design, and Social turn Sunday into stories people can see, save, and share.',
  },
];

export default async function MediaLanding() {
  const { member } = await getSession();
  const isMember = Boolean(member);
  const joinHref = isMember ? '/home' : '/join';
  const signInHref = isMember ? '/home' : '/login';
  const churchHref = process.env.CHURCH_HOST ? `https://${process.env.CHURCH_HOST}` : '/church';
  const lessonsMinutes = LESSONS.reduce((total, lesson) => total + lesson.minutes, 0);

  return (
    <div className="media-site">
      <a href="#main" className="media-skip">Skip to content</a>

      <header className="media-header">
        <div className="media-header__affiliation">
          <span>MFM BENSON YOUTH CHURCH <span aria-hidden="true">/</span> MEDIA UNIT</span>
          <a href={churchHref}>Church website <Icon name="arrow" className="media-arrow" /></a>
        </div>
        <nav className="media-nav" aria-label="Media unit navigation">
          <Link href="/" className="media-wordmark" aria-label="Benson YC Media home">
            <Logo size={38} />
            <span><strong>Benson YC</strong><small>Media department</small></span>
          </Link>
          <div className="media-nav__links">
            <a href="#run">The run</a>
            <a href="#departments">Departments</a>
            <a href="#series">Weekly work</a>
          </div>
          <Link href={signInHref} className="media-signin">{isMember ? 'Open workspace' : 'Member sign-in'}</Link>
        </nav>
      </header>

      <main id="main">
        <section className="media-call-sheet" aria-labelledby="media-title">
          <div className="media-call-sheet__folio">
            <span>CREW CALL / MEDIA UNIT</span>
            <span>MFM BENSON YOUTH CHURCH</span>
            <span>{String(DEPARTMENTS.length).padStart(2, '0')} DEPARTMENTS</span>
          </div>

          <div className="media-call-sheet__title">
            <h1 id="media-title">The crew behind Sunday.</h1>
            <p>We prepare the room, capture what matters, and carry the message into the week.</p>
          </div>

          <div className="media-call-sheet__details" aria-label="Media unit call sheet">
            <div className="media-detail">
              <span>EARLY CREW CALL</span>
              <strong>7:30am</strong>
              <small>Projection · Photography · Content</small>
            </div>
            <div className="media-detail">
              <span>WORK</span>
              <strong>Prepare · Capture · Share</strong>
            </div>
            <div className="media-detail">
              <span>HOME BASE</span>
              <strong>MFM Benson Youth Church</strong>
              <small>{CHURCH.area}</small>
            </div>
            <div className="media-call-sheet__actions">
              <Link href={joinHref} className="media-action media-action--primary">
                {isMember ? 'Go to your workspace' : 'Join the media unit'}
                <Icon name="arrow" className="media-arrow" />
              </Link>
              <Link href={signInHref} className="media-action media-action--quiet">{isMember ? 'Open member home' : 'Already on the team? Sign in'}</Link>
            </div>
          </div>

          <div className="media-run" id="run">
            <div className="media-run__heading">
              <h2>Sunday, from first check to final post</h2>
              <span>RUN OF SHOW</span>
            </div>
            <ol className="media-run__steps">
              {RUN_OF_SHOW.map((step) => (
                <li key={step.mark}>
                  <span className="media-run__mark">{step.mark}</span>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="media-departments" id="departments" aria-labelledby="departments-title">
          <div className="media-section-heading">
            <h2 id="departments-title">Find your department.</h2>
            <p>Different skills. One crew. Start where you’re curious; learn the rest with the team.</p>
          </div>
          <div className="media-department-list">
            {DEPARTMENTS.map((department) => (
              <article className="media-department" key={department.id}>
                <h3>{department.name}</h3>
                <p>{department.tagline}</p>
                <Link href={isMember ? `/departments/${department.id}` : '/join'} aria-label={`${isMember ? 'View' : 'Join'} ${department.name}`}>
                  <span>{isMember ? 'View department' : 'Join this crew'}</span>
                  <Icon name="arrow" className="media-arrow" />
                </Link>
              </article>
            ))}
          </div>
          <p className="media-onboarding-note">New to the unit? {LESSONS.length} short lessons take about {lessonsMinutes} minutes to complete.</p>
        </section>

        <section className="media-week" id="series" aria-labelledby="series-title">
          <div className="media-week__intro">
            <h2 id="series-title">The week has its own rhythm.</h2>
            <p>Our recurring series give the message a life beyond Sunday. Every post is made by a real department, for the people we serve.</p>
          </div>
          <ul className="media-series-list">
            {SERIES.map((series) => <li key={series}>{series}</li>)}
          </ul>
          <a className="media-instagram" href="https://www.instagram.com/mfmbensonyc/" target="_blank" rel="noreferrer">
            See the work on Instagram <Icon name="arrow" className="media-arrow" />
          </a>
        </section>

        <section className="media-close">
          <h2>Bring what you know.<br />Learn what you don’t.</h2>
          <Link href={joinHref} className="media-action media-action--primary">
            {isMember ? 'Open your workspace' : 'Join the media unit'}
            <Icon name="arrow" className="media-arrow" />
          </Link>
        </section>
      </main>

      <footer className="media-footer">
        <Link href="/" className="media-footer__brand"><Logo size={30} /> Benson YC Media</Link>
        <span>Part of MFM Benson Youth Church</span>
        <a href={churchHref}>Go to the church website <Icon name="arrow" className="media-arrow" /></a>
      </footer>
    </div>
  );
}
