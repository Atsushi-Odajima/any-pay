import { cn } from '@/shared/lib/cn';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn('flex rounded-xl bg-ink-800 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            value === o.value ? 'bg-ink-600 text-white' : 'text-mist hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
