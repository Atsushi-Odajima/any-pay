import { AlertCircle } from 'lucide-react';
import { toUserMessage } from '@/shared/lib/errors';

export function ErrorMessage({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger ${className ?? ''}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{toUserMessage(error)}</span>
    </div>
  );
}
