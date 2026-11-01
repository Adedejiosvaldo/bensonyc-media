import { AppShell } from '@/components/AppShell';
import { requireMember } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { member } = await requireMember();
  return (
    <AppShell name={member.full_name} role={member.role}>
      {children}
    </AppShell>
  );
}
