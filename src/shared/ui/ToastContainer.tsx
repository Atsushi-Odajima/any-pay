import { useToastStore } from './toast';
import { cn } from '@/shared/lib/cn';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+var(--safe-top))] z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto max-w-md rounded-xl px-4 py-2.5 text-sm shadow-lg animate-fade-up',
            t.tone === 'success' && 'bg-lime text-ink',
            t.tone === 'error' && 'bg-danger text-white',
            t.tone === 'info' && 'bg-ink-600 text-white',
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
