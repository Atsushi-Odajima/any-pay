import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const t = useT();
  const s =
    size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2';
  return (
    <span
      role="status"
      aria-label={t('ui.loading')}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        s,
        className,
      )}
    />
  );
}

export function PageLoading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-mist">
      <Spinner size="lg" />
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  );
}
