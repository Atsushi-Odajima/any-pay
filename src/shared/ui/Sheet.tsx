import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
}

/** 下から出るボトムシート */
export function Sheet({ open, onClose, title, children, dismissible = true }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/70"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        className={cn(
          'relative w-full max-w-md rounded-t-3xl bg-ink-800 px-5 pt-3 animate-fade-up',
          'pb-[calc(1.25rem+var(--safe-bottom))]',
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-500" />
        {(title || dismissible) && (
          <div className="mb-3 flex items-center">
            <h2 className="flex-1 text-base font-semibold">{title}</h2>
            {dismissible && (
              <button
                type="button"
                aria-label="閉じる"
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
