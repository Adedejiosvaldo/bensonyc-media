import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { LESSONS } from '@/content/lessons';
import { lessonsMinutes, sundayCall } from '@/lib/call';

const JOIN_STEPS = [
  { title: 'Your email', detail: 'We email you a one-time sign-in link. No password needed yet.' },
  { title: 'Pick your crew', detail: 'Your name, WhatsApp number and the department you want to serve in.' },
  { title: 'Onboarding lessons', detail: `${LESSONS.length} short lessons, about ${lessonsMinutes} minutes, then sign the pledge.` },
];

/**
 * The public sign-in and join pages wear the media site's call sheet: paper, ink rules and square controls,
 * so going from "Join the media unit" to the form never feels like leaving the site.
 * `step` turns the side panel into the join rundown with the current step marked.
 */
export function MediaAuthShell({ step, children }: { step?: 1 | 2 | 3; children: React.ReactNode }) {
  const { call, grace } = sundayCall();
  return (
    <div className="media-site media-auth-page">
      <a href="#main" className="media-skip">Skip to content</a>
      <header className="media-header">
        <nav className="media-nav media-nav--auth" aria-label="Media unit">
          <Link href="/" className="media-wordmark">
            <Logo size={38} />
            <span>
              <strong>Benson YC Media</strong>
              <small>MFM Benson Youth Church</small>
            </span>
          </Link>
          <Link href="/" className="media-auth__back">
            <Icon name="back" className="media-arrow" /> Media site
          </Link>
        </nav>
      </header>

      <main id="main" className="media-auth media-gutter">
        <div className="media-auth__form">{children}</div>

        {step ? (
          <aside className="media-auth__aside" aria-label="How joining works">
            <p className="media-auth__folio">Joining · {step} of 3</p>
            <ol className="media-auth__steps">
              {JOIN_STEPS.map((s, i) => {
                const n = i + 1;
                const state = n < step ? 'done' : n === step ? 'now' : 'next';
                return (
                  <li key={s.title} data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
                    <span className="media-auth__mark" aria-hidden="true">{state === 'done' ? <Icon name="check" className="media-arrow" /> : String(n).padStart(2, '0')}</span>
                    <span>
                      <strong>{s.title}{state === 'done' && <span className="sr-only"> (done)</span>}</strong>
                      <small>{s.detail}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
            {call && (
              <p className="media-auth__note">
                Sunday call is <b>{call}</b>{grace ? `, grace till ${grace}` : ''}. Your unit head puts you on the roster once onboarding is done.
              </p>
            )}
          </aside>
        ) : (
          <aside className="media-auth__aside media-auth__aside--ink" aria-label="The media unit">
            <p className="media-auth__folio">Media unit · Member sign-in</p>
            <p className="media-auth__slogan">Behind every Sunday is a team.</p>
            <dl className="media-auth__facts">
              {call && (
                <div>
                  <dt>Sunday call</dt>
                  <dd>{call}{grace ? ` · grace till ${grace}` : ''}</dd>
                </div>
              )}
              <div>
                <dt>Not on the team yet?</dt>
                <dd>
                  <Link href="/join">Join the media unit <Icon name="arrow" className="media-arrow" /></Link>
                </dd>
              </div>
            </dl>
          </aside>
        )}
      </main>

      <footer className="media-footer media-gutter">
        <span>Benson YC Media · Part of MFM Benson Youth Church</span>
        <Link href="/">Back to the media site <Icon name="arrow" className="media-arrow" /></Link>
      </footer>
    </div>
  );
}
