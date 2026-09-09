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
      {label && <span className="mb-1.5 block text-sm text-mist">{label}</span>}
      <span
        className={cn(
          'flex h-12 items-center gap-2 rounded-xl border bg-ink-800 px-3 transition-colors',
          'focus-within:border-lime',
          error ? 'border-danger' : 'border-ink-600',
        )}
      >
        {prefix && <span className="text-mist">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-full w-full bg-transparent text-base text-white outline-none placeholder:text-ink-400',
            className,
          )}
          {...rest}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-mist">{hint}</span>
      ) : null}
    </label>
  );
});
