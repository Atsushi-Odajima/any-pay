import { ArrowDownToLine, ArrowUpFromLine, Store, Send, Users, RotateCcw } from 'lucide-react';
import { ListRow } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDate, formatTime } from '@/shared/lib/date';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import type { Tables } from '@/types/database';
import type { TxType } from '../api';
import { describeTransaction } from '../labels';

const TX_ICON: Record<TxType, typeof Store> = {
  charge: ArrowDownToLine,
  payment: Store,
  transfer: Send,
  withdrawal: ArrowUpFromLine,
  refund: RotateCcw,
  split: Users,
};

export function TransactionRow({
  tx,
  amount,
  balanceAfter,
  createdAt,
  to,
  showDate = true,
}: {
  tx: Tables<'transactions'> & { merchant?: { name: string } | null };
  /** 自分の wallet から見た増減（正=入金） */
  amount: number;
  balanceAfter?: number;
  createdAt: string;
  to?: string;
  showDate?: boolean;
}) {
  const t = useT();
  const direction = amount >= 0 ? 'in' : 'out';
  const { title, subtitle } = describeTransaction(tx, direction);
  const Icon = TX_ICON[tx.type];
  const time = showDate
    ? `${formatDate(createdAt)} ${formatTime(createdAt)}`
    : formatTime(createdAt);
  return (
    <ListRow
      icon={<Icon className="h-5 w-5" />}
      title={
        <span className={cn(tx.status === 'refunded' && 'text-mist line-through')}>{title}</span>
      }
      subtitle={[time, subtitle].filter(Boolean).join(' · ')}
      right={
        <span className="block">
          <span
            className={cn(
              'block font-semibold tabular-nums',
              amount > 0 ? 'text-lime' : 'text-white',
            )}
          >
            {formatYen(amount, { sign: true })}
          </span>
          {balanceAfter !== undefined && (
            <span className="block text-[11px] tabular-nums text-mist">
              {t('history.balanceAfterShort', { amount: formatYen(balanceAfter) })}
            </span>
          )}
        </span>
      }
      to={to ?? `/history/${tx.id}`}
      chevron={false}
    />
  );
}
