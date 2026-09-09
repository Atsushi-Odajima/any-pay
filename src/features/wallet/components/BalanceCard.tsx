import { Link } from 'react-router';
import { Plus, Coins } from 'lucide-react';
import { formatPoints, formatYen } from '@/shared/lib/money';
import { Skeleton } from '@/shared/ui';

export function BalanceCard({
  balance,
  points,
  loading,
}: {
  balance: number | null | undefined;
  points: number | undefined;
  loading: boolean;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-ink-700 to-ink-800 p-5">
      <p className="text-xs text-mist">残高</p>
      {loading || balance === undefined || balance === null ? (
        <Skeleton className="mt-2 h-10 w-40" />
      ) : (
        <p className="mt-1 text-4xl font-bold tracking-tight" data-testid="balance">
          {formatYen(balance)}
        </p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Link
          to="/rewards/points"
          className="flex items-center gap-1.5 rounded-full bg-ink-600 px-3 py-1.5 text-xs text-white"
        >
          <Coins className="h-3.5 w-3.5 text-lime" />
          {points === undefined ? '— pt' : formatPoints(points)}
        </Link>
        <Link
          to="/charge"
          className="ml-auto flex items-center gap-1 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
        >
          <Plus className="h-4 w-4" />
          チャージ
        </Link>
      </div>
    </section>
  );
}
