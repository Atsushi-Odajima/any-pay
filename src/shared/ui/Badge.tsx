import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'neutral' | 'lime' | 'danger' | 'success' | 'warn';
const TONE: Record<Tone, string> = {
  neutral: 'bg-ink-600 text-mist',
  lime: 'bg-lime/15 text-lime',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-success/15 text-success',
  warn: 'bg-warn/15 text-warn',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
