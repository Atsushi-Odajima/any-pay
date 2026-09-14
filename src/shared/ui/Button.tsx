import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
  icon?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[0_6px_18px_rgba(255,107,26,0.28)] hover:bg-brand-600 active:bg-brand-600 disabled:bg-surface-3 disabled:text-faint disabled:shadow-none',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 active:bg-surface-3 disabled:text-faint',
  ghost: 'bg-transparent text-fg hover:bg-surface-2 active:bg-surface-2 disabled:text-faint',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/20',
  outline:
    'border border-line bg-surface text-fg hover:bg-surface-2 active:bg-surface-2 disabled:text-faint',
};
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-12 px-4 text-base rounded-xl',
  lg: 'h-14 px-5 text-lg rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  full = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors select-none',
        'disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-lime',
        VARIANT[variant],
        SIZE[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}
