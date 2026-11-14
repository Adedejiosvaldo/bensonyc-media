import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { CHURCH } from '@/content/church';
import { DEPARTMENTS } from '@/content/departments';
import { SERIES } from '@/content/brand';
import { LESSONS } from '@/content/lessons';
import { getSession } from '@/lib/auth';
import { callTime, lessonsMinutes, sundayCall } from '@/lib/call';

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
  const signInHref = isMember ? '/home' : '/login';
  const { call, grace } = sundayCall();
  const joinHref = (department?: string) => (isMember ? (department ? `/departments/${department}` : '/home') : department ? `/join?department=${department}` : '/join');

  return (
    <div className="media-site">
      <a href="#main" className="media-skip">Skip to content</a>

      <header className="media-header">
        <nav className="media-nav" aria-label="Media unit">
          <Link href="/" className="media-wordmark">
            <Logo size={38} />
            <span>
              <strong>Benson YC Media</strong>
              <small>MFM Benson Youth Church</small>
            </span>
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
        <section className="media-call-sheet media-gutter" aria-labelledby="media-title">
          <div className="media-call-sheet__folio" aria-hidden="true">
            <span>Crew call · Media unit</span>
            <span>{String(DEPARTMENTS.length).padStart(2, '0')} departments</span>
          </div>

          <div className="media-call-sheet__title">
            <h1 id="media-title">The crew behind Sunday.</h1>
            <p>We prepare the room, capture what matters, and carry the message into the week.</p>
            <div className="media-call-sheet__actions">
              <Link href={joinHref()} className="media-action media-action--primary">
                {isMember ? 'Go to your workspace' : 'Join the media unit'}
                <span className="media-action__dot" aria-hidden="true"><Icon name="arrow" className="media-arrow" /></span>
              </Link>
              {!isMember && <Link href="/login" className="media-action media-action--quiet">Already on the team? Sign in</Link>}
            </div>
          </div>

          <dl className="media-call-sheet__details">
            <div className="media-detail">
              <dt>Sunday call</dt>
              <dd>
                <strong>{call ?? 'See the roster'}</strong>
                {grace && <small>Grace till {grace}</small>}
              </dd>
            </div>
            <div className="media-detail">
              <dt>Home base</dt>
              <dd>
                <strong>MFM Benson Youth Church</strong>
                <small>{CHURCH.area}</small>
              </dd>
            </div>
            <div className="media-detail">
              <dt>Training</dt>
              <dd>
                <strong>{LESSONS.length} short lessons</strong>
                <small>About {lessonsMinutes} minutes, at your pace</small>
              </dd>
            </div>
          </dl>

          <div className="media-run" id="run">
            <div className="media-run__heading">
              <h2>Sunday, from first check to final post</h2>
              <span aria-hidden="true">Run of show</span>
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

        <section className="media-departments media-gutter" id="departments" aria-labelledby="departments-title">
          <div className="media-section-heading">
            <h2 id="departments-title">Find your department.</h2>
            <p>Different skills. One crew. Start where you’re curious; the team teaches you the rest. Pick a crew here and it’s already chosen when you sign up.</p>
          </div>
          <table className="media-crew">
            <caption className="sr-only">Media departments, what each one does, and when they’re called on Sunday</caption>
            <thead>
              <tr>
                <th scope="col">Department</th>
                <th scope="col">The brief</th>
                <th scope="col">Sunday call</th>
                <th scope="col"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((department, index) => {
                const time = callTime(department.before);
                return (
                  <tr key={department.id}>
                    <th scope="row">
                      <span className="media-crew__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      {department.name}
                    </th>
                    <td className="media-crew__brief">
                      {department.tagline}
                      <span>{department.mission}</span>
                    </td>
                    <td className="media-crew__call">
                      <span className="media-crew__label" aria-hidden="true">Call</span>
                      {time ?? <span className="media-crew__offsite">Through the week</span>}
                    </td>
                    <td className="media-crew__action">
                      <Link href={joinHref(department.id)}>
                        {isMember ? 'View department' : 'Join this crew'}
                        <span className="sr-only">: {department.name}</span>
                        <Icon name="arrow" className="media-arrow" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="media-week media-gutter" id="series" aria-labelledby="series-title">
          <div className="media-week__intro">
            <h2 id="series-title">The week has its own rhythm.</h2>
            <p>Our recurring series give the message a life beyond Sunday. Every post is made by a real department, for the people we serve.</p>
          </div>
          <div className="media-week__list">
            <ul className="media-series-list" aria-label="Recurring series">
              {SERIES.map((series) => <li key={series}>{series}</li>)}
            </ul>
            <a className="media-instagram" href="https://www.instagram.com/mfmbensonyc/" target="_blank" rel="noreferrer">
              See the work on Instagram<span className="sr-only"> (opens in a new tab)</span> <Icon name="arrow" className="media-arrow" />
            </a>
          </div>
        </section>

        <section className="media-close media-gutter" aria-labelledby="close-title">
          <h2 id="close-title">Bring what you know. Learn what you don’t.</h2>
          <Link href={joinHref()} className="media-action media-action--primary">
            {isMember ? 'Open your workspace' : 'Join the media unit'}
            <span className="media-action__dot" aria-hidden="true"><Icon name="arrow" className="media-arrow" /></span>
          </Link>
        </section>
      </main>

      <footer className="media-footer media-gutter">
        <Link href="/" className="media-footer__brand"><Logo size={30} /> Benson YC Media</Link>
        <span>Part of MFM Benson Youth Church · {CHURCH.area}</span>
        <span className="flex gap-5">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
