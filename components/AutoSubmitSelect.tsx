'use client';

type Option = { value: string; label: string };

/** A select that saves its form as soon as it changes. */
export function AutoSubmitSelect({ name, defaultValue, options, label, className = '' }: { name: string; defaultValue: string; options: Option[]; label: string; className?: string }) {
  return (
    <select
      name={name}
      aria-label={label}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`w-full rounded-lg border border-line bg-card px-2 py-1.5 text-xs font-semibold text-ink focus:border-magenta focus:outline-none ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
