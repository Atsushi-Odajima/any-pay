import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMyWallet } from '@/features/wallet/hooks';
import { Card, EmptyState, PageHeader, PageLoading } from '@/shared/ui';
import { currentMonthKey, monthLabel, monthRange, shiftMonth, formatDate } from '@/shared/lib/date';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { useLedger } from '../hooks';
import type { TxType } from '../api';
import { TransactionRow } from '../components/TransactionRow';
import { TX_TYPES, txTypeLabel } from '../labels';

export function HistoryPage() {
  const t = useT();
  const wallet = useMyWallet();
  const [month, setMonth] = useState(currentMonthKey());
  const [type, setType] = useState<TxType | 'all'>('all');
  const range = useMemo(() => monthRange(month), [month]);
  const ledger = useLedger(wallet.data?.id, {
    from: range.from,
    to: range.to,
    type: type === 'all' ? undefined : type,
  });

  const lines = ledger.data;
  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof lines>>();
    for (const line of lines ?? []) {
      const key = formatDate(line.created_at);
      const arr = map.get(key) ?? [];
      arr.push(line);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [lines]);

  const filters: Array<{ value: TxType | 'all'; label: string }> = [
    { value: 'all', label: t('history.all') },
    ...TX_TYPES.map((v) => ({ value: v, label: txTypeLabel(v) })),
  ];

  return (
    <>
      <PageHeader title={t('history.title')} />
      <div className="flex items-center justify-between px-4 pb-2">
        <button
          type="button"
          aria-label={t('history.prevMonth')}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="rounded-full p-2 hover:bg-ink-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold">{monthLabel(month)}</span>
        <button
          type="button"
          aria-label={t('history.nextMonth')}
          disabled={month >= currentMonthKey()}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="rounded-full p-2 hover:bg-ink-800 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setType(f.value)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs transition-colors',
              type === f.value ? 'border-lime bg-lime/10 text-lime' : 'border-ink-600 text-mist',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 px-4">
        {ledger.isPending || wallet.isPending ? (
          <PageLoading />
        ) : groups.length === 0 ? (
          <EmptyState title={t('history.emptyMonth')} />
        ) : (
          groups.map(([date, rows]) => (
            <section key={date}>
              <h2 className="mb-1 px-1 text-xs font-semibold text-mist">{date}</h2>
              <Card className="p-0">
                {rows.map((line) => (
                  <TransactionRow
                    key={line.id}
                    tx={line.transaction}
                    amount={line.amount}
                    balanceAfter={line.balance_after}
                    createdAt={line.created_at}
                    showDate={false}
                  />
                ))}
              </Card>
            </section>
          ))
        )}
      </div>
    </>
  );
}
