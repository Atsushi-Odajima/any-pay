import { useParams } from 'react-router';
import { useMyWallets } from '@/features/wallet/hooks';
import { Badge, Card, EmptyState, PageHeader, PageLoading } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { useTransaction } from '../hooks';
import { CHARGE_METHOD_LABEL, parseMeta } from '../meta';
import { describeTransaction, TX_TYPE_LABEL } from '../labels';

const STATUS_LABEL = {
  pending: '処理中',
  completed: '完了',
  failed: '失敗',
  refunded: '返金済み',
} as const;

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tx = useTransaction(id);
  const wallets = useMyWallets();

  if (tx.isPending || wallets.isPending) return <PageLoading />;
  if (!tx.data) {
    return (
      <>
        <PageHeader title="明細" back />
        <EmptyState title="取引が見つかりません" />
      </>
    );
  }

  const myWalletIds = new Set((wallets.data ?? []).map((w) => w.id));
  // 自分の wallet の台帳行（加盟店オーナーが自店の決済を見る場合は merchant wallet の行）
  const myLines = tx.data.ledger.filter((l) => myWalletIds.has(l.wallet_id));
  const primary = myLines[0];
  const direction = primary && primary.amount > 0 ? 'in' : 'out';
  const { title } = describeTransaction(tx.data, direction);
  const meta = parseMeta(tx.data.metadata);

  return (
    <>
      <PageHeader title="明細" back />
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
              {STATUS_LABEL[tx.data.status]}
            </Badge>
          </div>
        </div>

        <Card>
          <dl className="divide-y divide-ink-700 text-sm">
            <Row label="種別" value={TX_TYPE_LABEL[tx.data.type]} />
            <Row label="日時" value={formatDateTime(tx.data.completed_at ?? tx.data.created_at)} />
            {meta.method && (
              <Row label="方法" value={CHARGE_METHOD_LABEL[meta.method] ?? meta.method} />
            )}
            {meta.payment_method && <Row label="決済方式" value={meta.payment_method} />}
            {tx.data.merchant?.name && <Row label="店舗" value={tx.data.merchant.name} />}
            {meta.original_amount !== undefined && meta.discount !== undefined && (
              <>
                <Row label="元の金額" value={formatYen(meta.original_amount)} />
                <Row
                  label={`クーポン割引${meta.coupon_title ? `（${meta.coupon_title}）` : ''}`}
                  value={`-${formatYen(meta.discount)}`}
                />
              </>
            )}
            {meta.points !== undefined && meta.points !== 0 && (
              <Row label="ポイント" value={`${meta.points > 0 ? '+' : ''}${meta.points} pt`} />
            )}
            {tx.data.memo && <Row label="メモ" value={tx.data.memo} />}
            {primary && <Row label="取引後残高" value={formatYen(primary.balance_after)} />}
            <Row label="取引ID" value={<span className="font-mono text-xs">{tx.data.id}</span>} />
          </dl>
        </Card>

        {myLines.length > 1 && (
          <Card>
            <p className="mb-2 text-xs text-mist">台帳（自分の wallet 分）</p>
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
