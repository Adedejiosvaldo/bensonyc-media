'use client';
import { useState } from 'react';
import { Icon } from './Icon';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
    >
      <Icon name={done ? 'check' : 'copy'} className="h-4 w-4" />
      {done ? 'Copied' : label}
    </button>
  );
}
