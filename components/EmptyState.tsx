import { Icon } from './Icon';

/** One empty-state pattern for the workspace: what this is, why it's empty, and the next step. */
export function EmptyState({
  icon = 'spark',
  title,
  children,
  action,
  compact = false,
}: {
  icon?: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'gap-2 rounded-2xl border border-dashed border-line px-5 py-6' : 'gap-3 px-6 py-10'}`}>
      <span className={`flex items-center justify-center rounded-2xl bg-plum-100 text-accent ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        <Icon name={icon} className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </span>
      <p className="card-title">{title}</p>
      {children && <div className="max-w-sm text-sm leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
