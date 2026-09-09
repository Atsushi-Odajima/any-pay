import { Link } from 'react-router';
import { ChevronRight, ScanLine, TrendingUp } from 'lucide-react';
import { Card, EmptyState, Skeleton, toast } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDate } from '@/shared/lib/date';
import { playSuccessSound } from '@/shared/platform/sound';
import { vibrate } from '@/shared/platform/haptics';
import { useMyWallets } from '@/features/wallet/hooks';
import { parseMeta } from '@/features/history/meta';
import { useT } from '@/shared/i18n';
import {
  useMerchantContext,
  useMerchantTransactionStream,
  useMerchantTransactions,
  useTodaySummary,
} from '../hooks';
import { MerchantTxRow } from '../components/MerchantTxRow';

export function MerchantHomePage() {
  const t = useT();
  const { merchant } = useMerchantContext();
  const summary = useTodaySummary(merchant.id);
  const recent = useMerchantTransactions(merchant.id, { limit: 10 });
  const wallets = useMyWallets();
  const merchantWallet = wallets.data?.find((w) => w.id === merchant.wallet_id);

  useMerchantTransactionStream(merchant.id, (tx) => {
    if (tx.type !== 'payment') return;
    const meta = parseMeta(tx.metadata);
    playSuccessSound();
    vibrate('success');
    toast.success(
      t('merchant.home.received', {
        amount: formatYen(tx.amount),
        name: meta.payer_name ?? t('merchant.tx.customer'),
      }),
    );
  });

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <Card className="bg-gradient-to-br from-ink-700 to-ink-800">
        <div className="flex items-center gap-1 text-xs text-mist">
          <TrendingUp className="h-3.5 w-3.5" /> {t('merchant.home.todaySales')}{' '}
          {summary.data && (
            <span>{t('merchant.home.since', { date: formatDate(summary.data.since) })}</span>
          )}
        </div>
        {summary.data ? (
          <>
            <p className="mt-1 text-4xl font-bold tracking-tight">{formatYen(summary.data.net)}</p>
            <div className="mt-2 flex gap-4 text-xs text-mist">
              <span>{t('merchant.home.count', { n: summary.data.count })}</span>
              {summary.data.refund_count > 0 && (
                <span>
                  {t('merchant.home.refunds', {
                    n: summary.data.refund_count,
                    amount: formatYen(summary.data.refunds),
                  })}
                </span>
              )}
            </div>
          </>
        ) : (
          <Skeleton className="mt-2 h-10 w-40" />
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-mist">{t('merchant.home.storeBalance')}</span>
          <span className="font-semibold">
            {merchantWallet ? formatYen(merchantWallet.balance_cache) : '—'}
          </span>
        </div>
      </Card>

      <Link
        to="/merchant/accept"
        className="flex h-16 items-center justify-center gap-3 rounded-3xl bg-lime text-lg font-bold text-ink active:bg-lime-600"
      >
        <ScanLine className="h-6 w-6" /> {t('merchant.home.accept')}
      </Link>

      <section>
        <div className="mb-2 flex items-center">
          <h2 className="text-sm font-semibold text-mist">{t('merchant.home.recent')}</h2>
          <Link to="/merchant/transactions" className="ml-auto flex items-center text-xs text-mist">
            {t('merchant.home.seeAll')} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card className="p-0">
          {recent.data && recent.data.length > 0 ? (
            recent.data.map((tx) => <MerchantTxRow key={tx.id} tx={tx} />)
          ) : (
            <EmptyState
              title={t('merchant.home.empty')}
              description={t('merchant.home.emptySub')}
            />
          )}
        </Card>
      </section>
    </div>
  );
}
