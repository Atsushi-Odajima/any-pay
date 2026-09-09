import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, EmptyState, PageLoading } from '@/shared/ui';
import { currentMonthKey, formatDate, monthLabel, monthRange, shiftMonth } from '@/shared/lib/date';
import { useMerchantContext, useMerchantTransactions } from '../hooks';
import { MerchantTxRow } from '../components/MerchantTxRow';

export function MerchantTransactionsPage() {
  const { merchant } = useMerchantContext();
  const [month, setMonth] = useState(currentMonthKey());
  const range = useMemo(() => monthRange(month), [month]);
  const txs = useMerchantTransactions(merchant.id, { from: range.from, to: range.to, limit: 500 });
  const list = txs.data;
  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof list>>();
    for (const tx of list ?? []) {
      const key = formatDate(tx.created_at);
      map.set(key, [...(map.get(key) ?? []), tx]);
    }
    return [...map.entries()];
  }, [list]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="前の月"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="rounded-full p-2 hover:bg-ink-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold">{monthLabel(month)}</span>
        <button
          type="button"
          aria-label="次の月"
          disabled={month >= currentMonthKey()}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="rounded-full p-2 hover:bg-ink-800 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {txs.isPending ? (
        <PageLoading />
      ) : groups.length === 0 ? (
        <EmptyState title="この月の決済はありません" />
      ) : (
        groups.map(([date, rows]) => (
          <section key={date}>
            <h2 className="mb-1 px-1 text-xs font-semibold text-mist">{date}</h2>
            <Card className="p-0">
              {rows.map((tx) => (
                <MerchantTxRow key={tx.id} tx={tx} showDate={false} />
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
