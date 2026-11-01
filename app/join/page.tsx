import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { JoinForm } from './JoinForm';

export const metadata = { title: 'Join the unit' };

export default async function JoinPage() {
  const { supabase, user, member } = await getSession();
  if (!user) redirect('/login?next=/join');
  if (member) redirect('/home');
  const { data: departments } = await supabase.from('departments').select('id, name, short').order('sort');
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <Logo size={56} />
      <p className="eyebrow mb-2 mt-8">Step 1 of onboarding</p>
      <h1 className="font-display text-5xl uppercase leading-none">Welcome to the unit</h1>
      <p className="mb-8 mt-3 text-muted">Tell us who you are. If your unit head already listed your name, we will match you automatically.</p>
      <JoinForm departments={departments ?? []} email={user.email ?? ''} />
    </div>
  );
}
