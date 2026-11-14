import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { MediaAuthShell } from '@/components/MediaAuthShell';
import { JoinForm } from './JoinForm';

export const metadata = { title: 'Join the unit' };

export default async function JoinPage({ searchParams }: { searchParams: { department?: string } }) {
  const department = searchParams.department && /^[a-z]+$/.test(searchParams.department) ? searchParams.department : undefined;
  const { supabase, user, member } = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(department ? `/join?department=${department}` : '/join')}`);
  if (member) redirect('/home');
  const { data: departments } = await supabase.from('departments').select('id, name, short').order('sort');
  return (
    <MediaAuthShell step={2}>
      <p className="media-auth__eyebrow">Join the media unit</p>
      <h1 className="media-auth__title">Pick your crew</h1>
      <p className="media-auth__lead">Tell us who you are. If your unit head already listed your name, we’ll match you automatically.</p>
      <JoinForm departments={departments ?? []} email={user.email ?? ''} preselect={department} />
    </MediaAuthShell>
  );
}
