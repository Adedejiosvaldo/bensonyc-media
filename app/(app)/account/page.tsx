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
      <section className="card max-w-md space-y-6 p-6" aria-labelledby="password-title">
        <div>
          <h2 id="password-title" className="card-title">Password</h2>
          <p className="mt-1 text-sm text-muted">Use at least 8 characters. You can still use an emailed link any time.</p>
        </div>
        <div>
          <label htmlFor="account-email" className="label">Email</label>
          <input id="account-email" className="input bg-plum-100/50 text-muted" value={user.email ?? ''} readOnly aria-readonly="true" />
        </div>
        <AccountForm />
      </section>
    </div>
  );
}
