'use client';
import { useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * A submit button that asks first. It opens a native <dialog> that names the action and what it changes,
 * then submits the surrounding form. Esc, a backdrop click or the cancel button leave everything as it was.
 * Pass `when` to ask only in some cases, e.g. only when a role is being changed to Admin.
 */
export function ConfirmSubmit({
  children,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Keep things as they are',
  className = 'btn-primary',
  pendingText = 'Saving…',
  tone = 'danger',
  when,
}: {
  children: React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  className?: string;
  pendingText?: string;
  tone?: 'danger' | 'primary';
  when?: (form: HTMLFormElement) => boolean;
}) {
  const { pending } = useFormStatus();
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  return (
    <>
      <button
        ref={button}
        type="button"
        className={className}
        disabled={pending}
        onClick={(e) => {
          const form = e.currentTarget.form;
          if (!form) return;
          if (when && !when(form)) return form.requestSubmit();
          dialog.current?.showModal();
        }}
      >
        {pending ? pendingText : children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="m-auto w-[min(92vw,27rem)] overscroll-contain rounded-2xl border border-line bg-card p-0 text-ink shadow-[0_24px_60px_-20px_rgb(43_10_44/.5)] backdrop:bg-plum-950/55"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="p-6">
          <p id={`${id}-title`} className="text-lg font-bold leading-snug">{title}</p>
          <div id={`${id}-body`} className="mt-2 text-sm leading-relaxed text-muted">{body}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={() => dialog.current?.close()} autoFocus>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
              onClick={() => {
                dialog.current?.close();
                button.current?.form?.requestSubmit();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
