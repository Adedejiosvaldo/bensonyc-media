'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createMember, deleteMember, editMember, type MemberFormState } from '@/app/member-actions';
import { Icon } from '@/components/Icon';
import type { Member } from '@/lib/types';

type Dept = { id: string; name: string };

const PERMISSIONS = [
  { id: 'post', title: 'Post to socials', detail: 'Post to Instagram and TikTok and refresh Insights.' },
  { id: 'plan', title: 'Plan content', detail: 'Build and edit the weekly board for every department, and use the AI ideas.' },
  { id: 'roster', title: 'Run the roster', detail: 'Generate, publish and assign the whole roster.' },
] as const;

function Submit({ children, pending, className = 'btn-primary' }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={busy}>
      {busy ? pending : children}
    </button>
  );
}

/**
 * Add or edit a member in a modal. Editing also holds "Remove member", which asks once more before deleting.
 * Opens from its own trigger button; Esc, the close button or a click on the backdrop dismiss it.
 */
export function MemberDialog({ member, departments, isSelf = false }: { member?: Member; departments: Dept[]; isSelf?: boolean }) {
  const editing = !!member;
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(member?.status ?? 'active');
  const [role, setRole] = useState(member?.role ?? 'member');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, action] = useFormState<MemberFormState, FormData>(editing ? editMember : createMember, null);
  const [delState, delAction] = useFormState<MemberFormState, FormData>(deleteMember, null);
  const form = useRef<HTMLFormElement>(null);

  const show = () => {
    setOpen(true);
    setStatus(member?.status ?? 'active');
    setRole(member?.role ?? 'member');
    setConfirmDelete(false);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  // Close once a save or delete goes through; the table behind refreshes from the server.
  useEffect(() => {
    if (state?.ok || delState?.ok) {
      close();
      if (!editing) form.current?.reset();
    }
  }, [state, delState, editing]);

  const err = open && state && !state.ok ? state.message : null;
  const delErr = open && delState && !delState.ok ? delState.message : null;

  return (
    <>
      {editing ? (
        <button type="button" onClick={show} className="btn-ghost min-h-9 px-3 py-1.5 text-xs">
          <Icon name="rules" className="h-3.5 w-3.5" /> Edit<span className="sr-only"> {member.full_name}</span>
        </button>
      ) : (
        <button type="button" onClick={show} className="btn-primary">
          <Icon name="user" className="h-4 w-4" /> Add member
        </button>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="m-auto max-h-[92dvh] w-[min(94vw,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-card p-0 text-ink shadow-[0_24px_60px_-20px_rgb(43_10_44/.5)] backdrop:bg-plum-950/55"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <p className="kicker">{editing ? (member.user_id ? 'Registered member' : 'Not registered yet') : 'New member'}</p>
            <h2 id={`${id}-title`} className="card-title mt-1 truncate">{editing ? member.full_name : 'Add a member'}</h2>
          </div>
          <button type="button" onClick={close} className="btn-icon btn-ghost -mr-2 h-10 w-10" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {confirmDelete && editing ? (
          <form action={delAction} className="space-y-4 p-5">
            <input type="hidden" name="id" value={member.id} />
            <div className="alert-danger">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="font-normal">
                <p className="font-bold">Remove {member.full_name} for good?</p>
                <p className="mt-1">
                  Their lesson progress, pledge, blocked dates, swap requests and calendar link are deleted. Roster duties and board items they
                  held become unassigned. This can’t be undone.
                </p>
                {member.user_id && <p className="mt-1">Their sign-in stays; if they sign in again they’ll be asked to join afresh.</p>}
                <p className="mt-1">To keep their history, set their status to <b>Inactive</b> instead.</p>
              </div>
            </div>
            {delErr && <p role="alert" className="alert-danger">{delErr}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)} autoFocus>
                Keep {member.full_name.split(' ')[0]}
              </button>
              <Submit className="btn-danger" pending="Removing…">Remove for good</Submit>
            </div>
          </form>
        ) : (
          <form ref={form} action={action} className="space-y-4 p-5" key={open ? 'open' : 'closed'}>
            {editing && <input type="hidden" name="id" value={member.id} />}
            <div>
              <label htmlFor={`${id}-name`} className="label">Full name</label>
              <input id={`${id}-name`} name="full_name" required minLength={2} maxLength={80} defaultValue={member?.full_name ?? ''} className="input" autoComplete="off" autoFocus />
              {!editing && <p className="mt-1 text-xs text-muted">When they register with the same first name and department, they’re linked to this record.</p>}
            </div>

            {editing && member.email && (
              <div>
                <label htmlFor={`${id}-email`} className="label">Email <span className="font-normal text-muted">(their sign-in, can’t be changed here)</span></label>
                <input id={`${id}-email`} value={member.email} readOnly aria-readonly="true" className="input bg-plum-100/50 text-muted" />
              </div>
            )}

            <div>
              <label htmlFor={`${id}-phone`} className="label">WhatsApp number <span className="font-normal text-muted">(optional)</span></label>
              <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" defaultValue={member?.phone ?? ''} placeholder="0803 000 0000" className="input" autoComplete="off" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-dept`} className="label">Department</label>
                <select id={`${id}-dept`} name="department_id" defaultValue={member?.department_id ?? departments[0]?.id ?? ''} className="input">
                  <option value="">No department yet</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-role`} className="label">Role</label>
                <select id={`${id}-role`} name="role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} disabled={isSelf} className="input disabled:opacity-60">
                  <option value="member">Member</option>
                  <option value="head">Head</option>
                  <option value="admin">Admin</option>
                </select>
                {isSelf && <input type="hidden" name="role" value={role} />}
              </div>
            </div>
            {role === 'admin' && member?.role !== 'admin' && (
              <p className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/15 p-3 text-sm text-warn-ink">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                Admins can change anyone’s role, remove members, connect or disconnect the social accounts and post publicly for the unit.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-status`} className="label">Status</label>
                <select id={`${id}-status`} name="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={isSelf} className="input disabled:opacity-60">
                  <option value="active">Active</option>
                  <option value="on_break">On break</option>
                  <option value="inactive">Inactive</option>
                </select>
                {isSelf && <input type="hidden" name="status" value={status} />}
              </div>
              {status === 'on_break' && (
                <div>
                  <label htmlFor={`${id}-break`} className="label">Back on <span className="font-normal text-muted">(optional)</span></label>
                  <input id={`${id}-break`} name="break_until" type="date" defaultValue={member?.break_until ?? ''} className="input" />
                </div>
              )}
            </div>
            {isSelf && <p className="text-xs text-muted">You can’t change your own role or status. Ask another admin.</p>}

            <fieldset className="rounded-xl border border-line p-4">
              <legend className="label px-1">Extra permissions</legend>
              {role === 'admin' ? (
                <p className="text-sm text-muted">Admins can do everything below already.</p>
              ) : (
                <div className="space-y-2.5">
                  {PERMISSIONS.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" name="grants" value={p.id} defaultChecked={(member?.grants ?? []).includes(p.id)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--magenta))]" />
                      <span className="text-sm">
                        <b>{p.title}</b>
                        <span className="block text-muted">{p.detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {role === 'head' && <p className="mt-3 text-xs text-muted">As a head they can already manage their own department’s duties and board items.</p>}
            </fieldset>

            {err && (
              <p role="alert" className="alert-danger">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                {err}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
              {editing && !isSelf && (
                <button type="button" onClick={() => setConfirmDelete(true)} className="btn min-h-11 px-3 text-danger hover:bg-danger/10 sm:mr-auto">
                  <Icon name="x" className="h-4 w-4" /> Remove member
                </button>
              )}
              <button type="button" onClick={close} className="btn-ghost sm:ml-auto">Cancel</button>
              <Submit pending={editing ? 'Saving…' : 'Adding…'}>{editing ? 'Save changes' : 'Add member'}</Submit>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
