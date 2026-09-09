import { RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  PageLoading,
} from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { useLedgerStats, useReconcile } from '../hooks';

/** 管理者：balance_cache と台帳合計の突合 */
export function ReconcilePage() {
  const stats = useLedgerStats();
  const reconcile = useReconcile();
  const refresh = () => {
    void stats.refetch();
    void reconcile.refetch();
  };
  return (
    <>
      <PageHeader
        title="台帳の突合（管理者）"
        back="/more"
        right={
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={refresh}
          >
            再実行
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <ErrorMessage error={stats.error ?? reconcile.error} />
        {stats.data && (
          <Card>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-mist">ウォレット数</dt>
              <dd className="text-right tabular-nums">{stats.data.wallets}</dd>
              <dt className="text-mist">取引数</dt>
              <dd className="text-right tabular-nums">{stats.data.transactions}</dd>
              <dt className="text-mist">台帳行数</dt>
              <dd className="text-right tabular-nums">{stats.data.ledger_entries}</dd>
              <dt className="text-mist">台帳合計（常に 0）</dt>
              <dd
                className={`text-right tabular-nums ${stats.data.ledger_sum === 0 ? 'text-lime' : 'text-danger'}`}
              >
                {formatYen(stats.data.ledger_sum)}
              </dd>
              <dt className="text-mist">treasury 残高</dt>
              <dd className="text-right tabular-nums">{formatYen(stats.data.treasury_balance)}</dd>
              <dt className="text-mist">ユーザー・加盟店残高合計</dt>
              <dd className="text-right tabular-nums">
                {formatYen(stats.data.user_balance_total)}
              </dd>
            </dl>
            <p className="mt-3 text-xs text-mist">
              二重記帳のため「treasury 残高 + ユーザー・加盟店残高合計 = 0」が常に成り立ちます。
            </p>
          </Card>
        )}
        {reconcile.isPending ? (
          <PageLoading label="突合中…" />
        ) : reconcile.data && reconcile.data.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-10 w-10 text-lime" />}
            title="不一致はありません"
            description="すべての wallet で balance_cache = sum(ledger_entries.amount)"
          />
        ) : reconcile.data ? (
          <Card className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="h-4 w-4" /> {reconcile.data.length} 件の不一致
            </div>
            {reconcile.data.map((r) => (
              <div
                key={r.wallet_id}
                className="flex items-center gap-3 border-t border-ink-700 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{r.wallet_id}</p>
                  <p className="text-xs text-mist">
                    <Badge>{r.kind}</Badge> {r.owner_handle ? `@${r.owner_handle}` : 'system'}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p>cache {formatYen(r.balance_cache)}</p>
                  <p className="text-mist">ledger {formatYen(r.ledger_sum)}</p>
                  <p className="text-danger">diff {formatYen(r.diff, { sign: true })}</p>
                </div>
              </div>
            ))}
          </Card>
        ) : null}
      </div>
    </>
  );
}
