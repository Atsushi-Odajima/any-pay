import { RotateCcw, Store } from 'lucide-react';
import { Badge, ListRow } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDate, formatTime } from '@/shared/lib/date';
import { parseMeta } from '@/features/history/meta';
import { PAYMENT_METHOD_LABEL } from '@/features/history/labels';
import type { Transaction } from '../api';

export function MerchantTxRow({ tx, showDate = true }: { tx: Transaction; showDate?: boolean }) {
  const meta = parseMeta(tx.metadata);
  const isRefund = tx.type === 'refund';
  const time = showDate
    ? `${formatDate(tx.created_at)} ${formatTime(tx.created_at)}`
    : formatTime(tx.created_at);
  return (
    <ListRow
      icon={
        isRefund ? <RotateCcw className="h-5 w-5 text-danger" /> : <Store className="h-5 w-5" />
      }
      title={
        <span className="flex items-center gap-2">
          {meta.payer_name ?? '購入者'}
          {meta.payer_handle && <span className="text-xs text-mist">@{meta.payer_handle}</span>}
          {tx.status === 'refunded' && <Badge tone="warn">返金済み</Badge>}
        </span>
      }
      subtitle={[
        time,
        isRefund
          ? '返金'
          : (PAYMENT_METHOD_LABEL[meta.payment_method ?? ''] ?? meta.payment_method),
        meta.coupon_title,
      ]
        .filter(Boolean)
        .join(' · ')}
      right={
        <span className={`font-semibold tabular-nums ${isRefund ? 'text-danger' : 'text-lime'}`}>
          {isRefund ? '-' : '+'}
          {formatYen(tx.amount)}
        </span>
      }
      to={`/merchant/transactions/${tx.id}`}
      chevron={false}
    />
  );
}
