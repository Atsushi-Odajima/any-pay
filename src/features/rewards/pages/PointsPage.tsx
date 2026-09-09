import { Coins } from 'lucide-react';
import { usePointBalance } from '@/features/wallet/hooks';
import { Card, EmptyState, ListRow, PageHeader, PageLoading } from '@/shared/ui';
import { formatPoints } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { usePointEntries } from '../hooks';

const REASON_LABEL: Record<string, string> = {
  payment: '決済ポイント（0.5%）',
  refund: '返金による取り消し',
  bonus: 'ボーナス',
};

export function PointsPage() {
  const balance = usePointBalance();
  const entries = usePointEntries();
  return (
    <>
      <PageHeader title="ポイント" back="/more" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <Card className="text-center">
          <p className="text-xs text-mist">保有ポイント</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {balance.data === undefined ? '—' : formatPoints(balance.data)}
          </p>
          <p className="mt-2 text-xs text-mist">
            決済額の 0.5%
            を付与（切り捨て）。返金時は取り消されます。デモのためポイントでの支払いは未対応
          </p>
        </Card>
        {entries.isPending ? (
          <PageLoading />
        ) : !entries.data || entries.data.length === 0 ? (
          <EmptyState icon={<Coins className="h-10 w-10" />} title="ポイント履歴はありません" />
        ) : (
          <Card className="p-0">
            {entries.data.map((e) => (
              <ListRow
                key={e.id}
                icon={<Coins className="h-5 w-5" />}
                title={REASON_LABEL[e.reason] ?? e.reason}
                subtitle={formatDateTime(e.created_at)}
                right={
                  <span
                    className={`font-semibold tabular-nums ${e.delta > 0 ? 'text-lime' : 'text-danger'}`}
                  >
                    {e.delta > 0 ? '+' : ''}
                    {e.delta} pt
                  </span>
                }
                to={e.transaction_id ? `/history/${e.transaction_id}` : undefined}
                chevron={false}
              />
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
