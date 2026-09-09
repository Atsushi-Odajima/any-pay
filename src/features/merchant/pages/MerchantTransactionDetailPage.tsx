import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { RotateCcw } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  PageLoading,
  Sheet,
  toast,
} from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { useTransaction } from '@/features/history/hooks';
import { parseMeta } from '@/features/history/meta';
import { PAYMENT_METHOD_LABEL, TX_TYPE_LABEL } from '@/features/history/labels';
import { useMerchantContext, useRefund } from '../hooks';

export function MerchantTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { merchant } = useMerchantContext();
  const navigate = useNavigate();
  const tx = useTransaction(id);
  const refund = useRefund();
  const [confirm, setConfirm] = useState(false);

  if (tx.isPending) return <PageLoading />;
  if (!tx.data || tx.data.merchant_id !== merchant.id) {
    return (
      <>
        <PageHeader title="決済明細" back="/merchant/transactions" />
        <EmptyState title="決済が見つかりません" />
      </>
    );
  }
  const t = tx.data;
  const meta = parseMeta(t.metadata);
  const merchantLine = t.ledger.find((l) => l.wallet_id === merchant.wallet_id);
  const refundable = t.type === 'payment' && t.status === 'completed';

  return (
    <>
      <PageHeader title="決済明細" back="/merchant/transactions" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="py-2 text-center">
          <p className="text-sm text-mist">{t.type === 'refund' ? '返金' : '売上'}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {merchantLine ? formatYen(merchantLine.amount, { sign: true }) : formatYen(t.amount)}
          </p>
          <div className="mt-2">
            <Badge
              tone={
                t.status === 'refunded' ? 'warn' : t.status === 'completed' ? 'success' : 'neutral'
              }
            >
              {t.status === 'refunded' ? '返金済み' : t.status === 'completed' ? '完了' : t.status}
            </Badge>
          </div>
        </div>
        <Card>
          <dl className="divide-y divide-ink-700 text-sm">
            <Row label="種別" value={TX_TYPE_LABEL[t.type]} />
            <Row label="日時" value={formatDateTime(t.completed_at ?? t.created_at)} />
            <Row
              label="お客様"
              value={`${meta.payer_name ?? '—'}${meta.payer_handle ? `（@${meta.payer_handle}）` : ''}`}
            />
            {meta.payment_method && (
              <Row
                label="決済方式"
                value={PAYMENT_METHOD_LABEL[meta.payment_method] ?? meta.payment_method}
              />
            )}
            {meta.original_amount !== undefined && meta.discount !== undefined && (
              <>
                <Row label="元の金額" value={formatYen(meta.original_amount)} />
                <Row
                  label={`クーポン割引${meta.coupon_title ? `（${meta.coupon_title}）` : ''}`}
                  value={`-${formatYen(meta.discount)}`}
                />
                <Row label="お客様の支払額" value={formatYen(t.amount)} />
                {meta.subsidy !== undefined && meta.subsidy !== 0 && (
                  <Row label="プラットフォーム補填" value={formatYen(Math.abs(meta.subsidy))} />
                )}
              </>
            )}
            {t.memo && <Row label="メモ" value={t.memo} />}
            {merchantLine && (
              <Row label="取引後の店舗残高" value={formatYen(merchantLine.balance_after)} />
            )}
            {meta.refund_transaction_id && (
              <Row
                label="返金取引"
                value={
                  <button
                    type="button"
                    className="font-mono text-xs text-lime"
                    onClick={() => navigate(`/merchant/transactions/${meta.refund_transaction_id}`)}
                  >
                    {meta.refund_transaction_id.slice(0, 8)}…
                  </button>
                }
              />
            )}
            {meta.refund_of && (
              <Row
                label="元の決済"
                value={
                  <button
                    type="button"
                    className="font-mono text-xs text-lime"
                    onClick={() => navigate(`/merchant/transactions/${meta.refund_of}`)}
                  >
                    {meta.refund_of.slice(0, 8)}…
                  </button>
                }
              />
            )}
            <Row label="取引ID" value={<span className="font-mono text-xs">{t.id}</span>} />
          </dl>
        </Card>

        {refundable && (
          <Button
            variant="danger"
            full
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setConfirm(true)}
          >
            全額返金する
          </Button>
        )}
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="返金の確認">
        <p className="text-sm text-mist">
          {formatYen(t.amount)}{' '}
          をお客様に返金します。付与したポイントは取り消され、使用したクーポンは復活します。この操作は取り消せません。
        </p>
        <ErrorMessage error={refund.error} className="mt-3" />
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" full onClick={() => setConfirm(false)}>
            やめる
          </Button>
          <Button
            variant="danger"
            full
            loading={refund.isPending}
            onClick={() =>
              refund.mutate(t.id, {
                onSuccess: () => {
                  toast.success('返金しました');
                  setConfirm(false);
                },
              })
            }
          >
            返金する
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-mist">{label}</dt>
      <dd className="text-right break-all">{value}</dd>
    </div>
  );
}
