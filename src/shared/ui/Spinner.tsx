import { cn } from '@/shared/lib/cn';

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const s =
    size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2';
  return (
    <span
      role="status"
      aria-label="読み込み中"
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        s,
        className,
      )}
    />
  );
}

export function PageLoading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-mist">
      <Spinner size="lg" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
