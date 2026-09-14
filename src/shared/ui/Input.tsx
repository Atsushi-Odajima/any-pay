import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, prefix, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block text-sm text-muted">{label}</span>}
      <span
        className={cn(
          'flex h-12 items-center gap-2 rounded-xl border bg-surface px-3 transition-colors',
          'focus-within:border-brand',
          error ? 'border-danger' : 'border-line',
        )}
      >
        {prefix && <span className="text-muted">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-full w-full bg-transparent text-base text-fg outline-none placeholder:text-faint',
            className,
          )}
          {...rest}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
});
