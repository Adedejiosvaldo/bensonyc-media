import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';

/** Shared shell for the public Privacy Policy and Terms pages, in the media site's call-sheet style. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="media-site">
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
      <main id="main" className="media-gutter media-legal">
        <p className="media-auth__eyebrow">Benson YC Media</p>
        <h1 className="media-auth__title">{title}</h1>
        <p className="media-legal__updated">Last updated {updated}</p>
        <div className="media-legal__body">{children}</div>
      </main>
      <footer className="media-footer media-gutter">
        <span>Benson YC Media · Part of MFM Benson Youth Church</span>
        <span className="flex gap-5">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
