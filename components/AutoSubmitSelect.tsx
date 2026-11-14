'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

type Option = { value: string; label: string };

/**
 * A select that saves its form once the choice is settled.
 * Pointer and touch picks save straight away. Keyboard arrowing only previews the value;
 * it saves on Enter or when focus leaves, so stepping through the list never fires a save per keypress.
 */
export function AutoSubmitSelect({ name, defaultValue, options, label, className = '' }: { name: string; defaultValue: string; options: Option[]; label: string; className?: string }) {
  const { pending } = useFormStatus();
  const keyboard = useRef(false);
  const dirty = useRef(false);
  const wasPending = useRef(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const finished = wasPending.current && !pending;
    wasPending.current = pending;
    if (!finished) return;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [pending]);

  const save = (el: HTMLSelectElement) => {
    dirty.current = false;
    el.form?.requestSubmit();
  };

  return (
    <span className="relative block">
      <select
        name={name}
        aria-label={label}
        defaultValue={defaultValue}
        aria-busy={pending}
        onKeyDown={(e) => {
          keyboard.current = true;
          if (e.key === 'Enter' && dirty.current) {
            e.preventDefault();
            save(e.currentTarget);
          }
        }}
        onPointerDown={() => {
          keyboard.current = false;
        }}
        onChange={(e) => {
          if (keyboard.current) dirty.current = true;
          else save(e.currentTarget);
        }}
        onBlur={(e) => {
          if (dirty.current) save(e.currentTarget);
        }}
        className={`select-sm w-full pr-16 ${pending ? 'opacity-60' : ''} ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span aria-live="polite" className="pointer-events-none absolute inset-y-0 right-7 flex items-center text-[11px] font-bold text-good-ink">
        {pending ? <span className="text-muted">Saving…</span> : saved ? 'Saved' : ''}
      </span>
    </span>
  );
}
