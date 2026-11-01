import { requireMember } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { AccountForm } from './AccountForm';

export const metadata = { title: 'Account' };

export default async function AccountPage() {
  const { user } = await requireMember();

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Account">
        Set a password so you can sign in straight away next time, instead of waiting on an email link.
      </PageHeader>
      <div className="max-w-sm space-y-6">
        <div>
          <p className="label">Email</p>
          <input className="input opacity-70" value={user.email ?? ''} disabled />
        </div>
        <AccountForm />
      </div>
    </div>
  );
}
