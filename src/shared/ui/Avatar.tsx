import { cn } from '@/shared/lib/cn';

export function Avatar({
  name,
  url,
  size = 'md',
  className,
}: {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const s =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-10 w-10 text-sm';
  if (url) {
    return <img src={url} alt="" className={cn('rounded-full object-cover', s, className)} />;
  }
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-lime-900 font-semibold text-lime',
        s,
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
