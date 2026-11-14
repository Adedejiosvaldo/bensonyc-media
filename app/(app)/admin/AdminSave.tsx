'use client';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';

/** Saves a member row. Asks first only when the row is about to make someone an Admin. */
export function AdminSave({ name }: { name: string }) {
  return (
    <ConfirmSubmit
      className="btn-ghost min-h-9 px-3 py-1.5 text-xs"
      pendingText="Saving…"
      tone="primary"
      title={`Make ${name} an Admin?`}
      body="Admins can change anyone’s role, connect or disconnect the social accounts, and post publicly for the unit."
      confirmLabel="Make Admin"
      when={(form) => {
        const role = form.elements.namedItem('role') as HTMLSelectElement | null;
        return !!role && role.value === 'admin' && role.dataset.was !== 'admin';
      }}
    >
      Save<span className="sr-only"> {name}</span>
    </ConfirmSubmit>
  );
}
