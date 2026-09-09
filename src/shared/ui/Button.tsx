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
    'bg-lime text-ink hover:bg-lime-600 active:bg-lime-600 disabled:bg-ink-600 disabled:text-mist',
  secondary: 'bg-ink-700 text-white hover:bg-ink-600 active:bg-ink-600 disabled:text-mist',
  ghost: 'bg-transparent text-white hover:bg-ink-800 active:bg-ink-800 disabled:text-mist',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 active:bg-danger/25',
  outline: 'border border-ink-500 text-white hover:bg-ink-800 active:bg-ink-800 disabled:text-mist',
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
