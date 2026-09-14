import { Delete } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { vibrate } from '@/shared/platform/haptics';
import { useT } from '@/shared/i18n';

interface Props {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  disabled?: boolean;
  onComplete?: (v: string) => void;
}

/** PIN 入力用テンキー（4〜6桁） */
export function PinPad({ value, onChange, maxLength = 6, disabled, onComplete }: Props) {
  const t = useT();
  const push = (d: string) => {
    if (disabled || value.length >= maxLength) return;
    vibrate('light');
    const next = value + d;
    onChange(next);
    if (next.length === maxLength) onComplete?.(next);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : k === 'del' ? (
          <button
            key={i}
            type="button"
            aria-label={t('security.gate.deleteOne')}
            disabled={disabled}
            onClick={() => onChange(value.slice(0, -1))}
            className="flex h-14 items-center justify-center rounded-2xl text-muted hover:bg-surface-2 active:bg-surface-3"
          >
            <Delete className="h-6 w-6" />
          </button>
        ) : (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => push(k)}
            className={cn(
              'h-14 rounded-2xl bg-surface-2 text-2xl font-semibold hover:bg-surface-3 active:bg-line',
              disabled && 'opacity-50',
            )}
          >
            {k}
          </button>
        ),
      )}
    </div>
  );
}

export function PinDots({
  length,
  max = 6,
  min = 4,
}: {
  length: number;
  max?: number;
  min?: number;
}) {
  const t = useT();
  return (
    <div
      className="flex items-center justify-center gap-3"
      aria-label={t('security.gate.entered', { n: length })}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-3.5 w-3.5 rounded-full border transition-colors',
            i < length
              ? 'border-brand bg-brand'
              : i < min
                ? 'border-line'
                : 'border-line border-dashed',
          )}
        />
      ))}
    </div>
  );
}
