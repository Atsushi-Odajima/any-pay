import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';

interface Props {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  to?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}

export function ListRow({ icon, title, subtitle, right, to, onClick, chevron, className }: Props) {
  const body = (
    <>
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700 text-mist">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-mist">{subtitle}</span>}
      </span>
      {right && <span className="shrink-0 text-right">{right}</span>}
      {(chevron ?? (to || onClick)) && <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
    </>
  );
  const cls = cn(
    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
    (to || onClick) && 'hover:bg-ink-700 active:bg-ink-700',
    className,
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
