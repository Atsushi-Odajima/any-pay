import { useParams } from 'react-router';
import { useMyWallets } from '@/features/wallet/hooks';
import { Badge, Card, EmptyState, PageHeader, PageLoading } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { useT } from '@/shared/i18n';
import { useTransaction } from '../hooks';
import { chargeMethodLabel, parseMeta } from '../meta';
import { describeTransaction, paymentMethodLabel, txTypeLabel } from '../labels';

export function TransactionDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const tx = useTransaction(id);
  const wallets = useMyWallets();

  if (tx.isPending || wallets.isPending) return <PageLoading />;
  if (!tx.data) {
    return (
      <>
        <PageHeader title={t('history.detail')} back />
        <EmptyState title={t('history.notFound')} />
      </>
    );
  }

  const myWalletIds = new Set((wallets.data ?? []).map((w) => w.id));
  const myLines = tx.data.ledger.filter((l) => myWalletIds.has(l.wallet_id));
  const primary = myLines[0];
  const direction = primary && primary.amount > 0 ? 'in' : 'out';
  const { title } = describeTransaction(tx.data, direction);
  const meta = parseMeta(tx.data.metadata);
  const method = chargeMethodLabel(meta.method);
  const paymentMethod = paymentMethodLabel(meta.payment_method);

  return (
    <>
      <PageHeader title={t('history.detail')} back />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="py-4 text-center">
          <p className="text-sm text-mist">{title}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {primary ? formatYen(primary.amount, { sign: true }) : formatYen(tx.data.amount)}
          </p>
          <div className="mt-2">
            <Badge
              tone={
                tx.data.status === 'completed'
                  ? 'success'
                  : tx.data.status === 'refunded'
                    ? 'warn'
                    : 'neutral'
              }
            >
              {t(`history.status.${tx.data.status}`)}
            </Badge>
          </div>
        </div>

        <Card>
          <dl className="divide-y divide-ink-700 text-sm">
            <Row label={t('history.type')} value={txTypeLabel(tx.data.type)} />
            <Row
              label={t('history.dateTime')}
              value={formatDateTime(tx.data.completed_at ?? tx.data.created_at)}
            />
            {method && <Row label={t('history.method')} value={method} />}
            {paymentMethod && <Row label={t('history.paymentMethod')} value={paymentMethod} />}
            {tx.data.merchant?.name && (
              <Row label={t('history.store')} value={tx.data.merchant.name} />
            )}
            {meta.original_amount !== undefined && meta.discount !== undefined && (
              <>
                <Row label={t('history.originalAmount')} value={formatYen(meta.original_amount)} />
                <Row
                  label={`${t('history.couponDiscount')}${meta.coupon_title ? `（${meta.coupon_title}）` : ''}`}
                  value={`-${formatYen(meta.discount)}`}
                />
              </>
            )}
            {meta.points !== undefined && meta.points !== 0 && (
              <Row
                label={t('history.points')}
                value={`${meta.points > 0 ? '+' : ''}${meta.points} pt`}
              />
            )}
            {tx.data.memo && <Row label={t('history.memo')} value={tx.data.memo} />}
            {primary && (
              <Row label={t('history.balanceAfter')} value={formatYen(primary.balance_after)} />
            )}
            <Row
              label={t('history.txId')}
              value={<span className="font-mono text-xs">{tx.data.id}</span>}
            />
          </dl>
        </Card>

        {myLines.length > 1 && (
          <Card>
            <p className="mb-2 text-xs text-mist">{t('history.ledgerMine')}</p>
            {myLines.map((l) => (
              <div key={l.id} className="flex justify-between py-1 text-sm">
                <span className="font-mono text-xs text-mist">{l.wallet_id.slice(0, 8)}…</span>
                <span>
                  {formatYen(l.amount, { sign: true })} → {formatYen(l.balance_after)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
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
