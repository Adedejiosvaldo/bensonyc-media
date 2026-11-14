'use client';
import { useFormState } from 'react-dom';
import { useEffect, useRef } from 'react';
import { addBlockout } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';

export function BlockoutForm({ today }: { today: string }) {
  const [state, action] = useFormState(addBlockout, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_date" className="label">From</label>
          <input id="start_date" name="start_date" type="date" min={today} required className="input" />
        </div>
        <div>
          <label htmlFor="end_date" className="label">To <span className="font-normal text-muted">(optional)</span></label>
          <input id="end_date" name="end_date" type="date" min={today} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="reason" className="label">Reason <span className="font-normal text-muted">(optional, your team sees it)</span></label>
        <input id="reason" name="reason" maxLength={120} placeholder="Exams, travelling, family event…" className="input" />
      </div>
      {state && (
        <p role={state.ok ? 'status' : 'alert'} className={state.ok ? 'alert-good' : 'alert-danger'}>
          {state.message}
        </p>
      )}
      <SubmitButton className="btn-primary w-full py-3" pendingText="Saving…">Block these dates</SubmitButton>
    </form>
  );
}
