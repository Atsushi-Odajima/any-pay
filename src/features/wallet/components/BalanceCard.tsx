import { Link } from 'react-router';
import { Plus, Coins } from 'lucide-react';
import { formatPoints, formatYen } from '@/shared/lib/money';
import { Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

export function BalanceCard({
  balance,
  points,
  loading,
}: {
  balance: number | null | undefined;
  points: number | undefined;
  loading: boolean;
}) {
  const t = useT();
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-600 p-5 text-white shadow-[0_14px_34px_rgba(255,107,26,0.30)]">
      <span className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/5" />
      <p className="relative text-xs font-medium text-white/80">{t('home.balance')}</p>
      {loading || balance === undefined || balance === null ? (
        <Skeleton className="relative mt-2 h-10 w-40 bg-white/20" />
      ) : (
        <p className="relative mt-1 text-4xl font-bold tracking-tight" data-testid="balance">
          {formatYen(balance)}
        </p>
      )}
      <div className="relative mt-4 flex items-center gap-3">
        <Link
          to="/rewards/points"
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
        >
          <Coins className="h-3.5 w-3.5" />
          {points === undefined ? '— pt' : formatPoints(points)}
        </Link>
        <Link
          to="/charge"
          className="ml-auto flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {t('home.charge')}
        </Link>
      </div>
    </section>
  );
}
