import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {icon && <div className="mb-1 text-ink-400">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-mist">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
