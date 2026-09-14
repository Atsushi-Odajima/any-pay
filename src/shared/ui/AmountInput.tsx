import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatYen, parseYen } from '@/shared/lib/money';
import { useT } from '@/shared/i18n';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  error?: string;
  max?: number;
  autoFocus?: boolean;
  quickAmounts?: number[];
  disabled?: boolean;
}

/** 大きな金額入力。整数円のみ受け付ける */
export function AmountInput({
  value,
  onChange,
  label,
  error,
  max,
  autoFocus,
  quickAmounts,
  disabled,
}: Props) {
  const id = useId();
  const t = useT();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label ?? t('ui.amount')}
      </label>
      <div
        className={cn(
          'flex items-baseline gap-1 rounded-2xl border bg-surface px-4 py-3 focus-within:border-brand',
          error ? 'border-danger' : 'border-line',
        )}
      >
        <span className="text-2xl font-semibold text-muted">¥</span>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="0"
          value={value === null ? '' : value.toLocaleString('ja-JP')}
          onChange={(e) => onChange(parseYen(e.target.value))}
          className="w-full bg-transparent text-4xl font-bold tracking-tight text-fg outline-none placeholder:text-faint"
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : max ? (
        <p className="mt-1 text-xs text-muted">{t('ui.limit', { amount: formatYen(max) })}</p>
      ) : null}
      {quickAmounts && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => onChange(q)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                value === q
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line text-muted hover:border-faint',
              )}
            >
              {formatYen(q)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
