import { MediaAuthShell } from '@/components/MediaAuthShell';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = searchParams.next ?? '/home';
  // Recruits arrive here from "Join the media unit": say so, instead of a bare "Sign in".
  const joining = next.startsWith('/join');

  return (
    <MediaAuthShell step={joining ? 1 : undefined}>
      <p className="media-auth__eyebrow">{joining ? 'Join the media unit' : 'Member sign-in'}</p>
      <h1 className="media-auth__title">{joining ? 'Start with your email' : 'Welcome back'}</h1>
      <p className="media-auth__lead">
        {joining
          ? 'Enter your email and we’ll send you a one-time link. Open it on this phone or computer to carry on.'
          : 'Sign in to see your duty, your content and this week’s board. New to the unit? Use your email here too; you’ll register right after.'}
      </p>
      {searchParams.error && (
        <p role="alert" className="alert-danger mb-5">
          That sign-in link has expired or was already used. Request a new one below.
        </p>
      )}
      <LoginForm next={next} startWithLink={joining} />
    </MediaAuthShell>
  );
}
