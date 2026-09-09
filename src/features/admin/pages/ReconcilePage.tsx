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
import { useT } from '@/shared/i18n';
import { useLedgerStats, useReconcile } from '../hooks';

/** 管理者：balance_cache と台帳合計の突合 */
export function ReconcilePage() {
  const t = useT();
  const stats = useLedgerStats();
  const reconcile = useReconcile();
  const refresh = () => {
    void stats.refetch();
    void reconcile.refetch();
  };
  return (
    <>
      <PageHeader
        title={t('admin.title')}
        back="/more"
        right={
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={refresh}
          >
            {t('admin.rerun')}
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <ErrorMessage error={stats.error ?? reconcile.error} />
        {stats.data && (
          <Card>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-mist">{t('admin.wallets')}</dt>
              <dd className="text-right tabular-nums">{stats.data.wallets}</dd>
              <dt className="text-mist">{t('admin.transactions')}</dt>
              <dd className="text-right tabular-nums">{stats.data.transactions}</dd>
              <dt className="text-mist">{t('admin.ledgerRows')}</dt>
              <dd className="text-right tabular-nums">{stats.data.ledger_entries}</dd>
              <dt className="text-mist">{t('admin.ledgerSum')}</dt>
              <dd
                className={`text-right tabular-nums ${stats.data.ledger_sum === 0 ? 'text-lime' : 'text-danger'}`}
              >
                {formatYen(stats.data.ledger_sum)}
              </dd>
              <dt className="text-mist">{t('admin.treasury')}</dt>
              <dd className="text-right tabular-nums">{formatYen(stats.data.treasury_balance)}</dd>
              <dt className="text-mist">{t('admin.userTotal')}</dt>
              <dd className="text-right tabular-nums">
                {formatYen(stats.data.user_balance_total)}
              </dd>
            </dl>
            <p className="mt-3 text-xs text-mist">{t('admin.note')}</p>
          </Card>
        )}
        {reconcile.isPending ? (
          <PageLoading label={t('admin.checking')} />
        ) : reconcile.data && reconcile.data.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-10 w-10 text-lime" />}
            title={t('admin.noMismatch')}
            description={t('admin.noMismatchSub')}
          />
        ) : reconcile.data ? (
          <Card className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-danger">
              <AlertTriangle className="h-4 w-4" />{' '}
              {t('admin.mismatches', { n: reconcile.data.length })}
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
