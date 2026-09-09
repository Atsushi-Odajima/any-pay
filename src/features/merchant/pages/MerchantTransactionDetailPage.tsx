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
import { paymentMethodLabel, txTypeLabel } from '@/features/history/labels';
import { useT } from '@/shared/i18n';
import { useMerchantContext, useRefund } from '../hooks';

export function MerchantTransactionDetailPage() {
  const t = useT();
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
        <PageHeader title={t('merchant.tx.detail')} back="/merchant/transactions" />
        <EmptyState title={t('merchant.tx.notFound')} />
      </>
    );
  }
  const d = tx.data;
  const meta = parseMeta(d.metadata);
  const merchantLine = d.ledger.find((l) => l.wallet_id === merchant.wallet_id);
  const refundable = d.type === 'payment' && d.status === 'completed';
  const paymentMethod = paymentMethodLabel(meta.payment_method);

  return (
    <>
      <PageHeader title={t('merchant.tx.detail')} back="/merchant/transactions" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="py-2 text-center">
          <p className="text-sm text-mist">
            {d.type === 'refund' ? t('merchant.tx.refund') : t('merchant.tx.sale')}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {merchantLine ? formatYen(merchantLine.amount, { sign: true }) : formatYen(d.amount)}
          </p>
          <div className="mt-2">
            <Badge
              tone={
                d.status === 'refunded' ? 'warn' : d.status === 'completed' ? 'success' : 'neutral'
              }
            >
              {t(`history.status.${d.status}`)}
            </Badge>
          </div>
        </div>
        <Card>
          <dl className="divide-y divide-ink-700 text-sm">
            <Row label={t('merchant.tx.type')} value={txTypeLabel(d.type)} />
            <Row
              label={t('merchant.tx.dateTime')}
              value={formatDateTime(d.completed_at ?? d.created_at)}
            />
            <Row
              label={t('merchant.tx.customerLabel')}
              value={`${meta.payer_name ?? '—'}${meta.payer_handle ? ` (@${meta.payer_handle})` : ''}`}
            />
            {paymentMethod && <Row label={t('merchant.tx.method')} value={paymentMethod} />}
            {meta.original_amount !== undefined && meta.discount !== undefined && (
              <>
                <Row label={t('merchant.tx.original')} value={formatYen(meta.original_amount)} />
                <Row
                  label={`${t('merchant.tx.discount')}${meta.coupon_title ? `（${meta.coupon_title}）` : ''}`}
                  value={`-${formatYen(meta.discount)}`}
                />
                <Row label={t('merchant.tx.customerPaid')} value={formatYen(d.amount)} />
                {meta.subsidy !== undefined && meta.subsidy !== 0 && (
                  <Row label={t('merchant.tx.subsidy')} value={formatYen(Math.abs(meta.subsidy))} />
                )}
              </>
            )}
            {d.memo && <Row label={t('merchant.tx.memo')} value={d.memo} />}
            {merchantLine && (
              <Row
                label={t('merchant.tx.balanceAfter')}
                value={formatYen(merchantLine.balance_after)}
              />
            )}
            {meta.refund_transaction_id && (
              <Row
                label={t('merchant.tx.refundTx')}
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
                label={t('merchant.tx.originalTx')}
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
            <Row
              label={t('merchant.tx.txId')}
              value={<span className="font-mono text-xs">{d.id}</span>}
            />
          </dl>
        </Card>

        {refundable && (
          <Button
            variant="danger"
            full
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setConfirm(true)}
          >
            {t('merchant.tx.refundAll')}
          </Button>
        )}
      </div>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('merchant.tx.refundConfirmTitle')}
      >
        <p className="text-sm text-mist">
          {t('merchant.tx.refundConfirmBody', { amount: formatYen(d.amount) })}
        </p>
        <ErrorMessage error={refund.error} className="mt-3" />
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" full onClick={() => setConfirm(false)}>
            {t('merchant.tx.stop')}
          </Button>
          <Button
            variant="danger"
            full
            loading={refund.isPending}
            onClick={() =>
              refund.mutate(d.id, {
                onSuccess: () => {
                  toast.success(t('merchant.tx.refundedToast'));
                  setConfirm(false);
                },
              })
            }
          >
            {t('merchant.tx.refundButton')}
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
