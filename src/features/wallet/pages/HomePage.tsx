import { Link } from 'react-router';
import { QrCode, Bell, ChevronRight } from 'lucide-react';
import { useMyProfile } from '@/features/auth/hooks';
import { useLedger } from '@/features/history/hooks';
import { useUnreadCount } from '@/features/notifications/hooks';
import { TransactionRow } from '@/features/history/components/TransactionRow';
import { Avatar, Card, EmptyState } from '@/shared/ui';
import { env } from '@/shared/lib/env';
import { useMyWallet, usePointBalance } from '../hooks';
import { BalanceCard } from '../components/BalanceCard';

export function HomePage() {
  const profile = useMyProfile();
  const wallet = useMyWallet();
  const points = usePointBalance();
  const recent = useLedger(wallet.data?.id, { limit: 3 });
  const unread = useUnreadCount();

  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(0.75rem+var(--safe-top))] pb-4">
      <header className="flex items-center gap-3">
        <Link to="/settings/profile" className="flex items-center gap-2">
          <Avatar
            name={profile.data?.display_name ?? '?'}
            url={profile.data?.avatar_url}
            size="sm"
          />
          <span className="text-sm font-medium">{profile.data?.display_name ?? env.appName}</span>
        </Link>
        <Link
          to="/notifications"
          aria-label="通知"
          className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-800"
        >
          <Bell className="h-5 w-5" />
          {(unread.data ?? 0) > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">
              {unread.data}
            </span>
          )}
        </Link>
      </header>

      <BalanceCard
        balance={wallet.data?.balance_cache}
        points={points.data}
        loading={wallet.isPending}
      />

      <Link
        to="/pay"
        className="flex h-20 items-center justify-center gap-3 rounded-3xl bg-white text-xl font-bold text-ink active:bg-neutral-200"
      >
        <QrCode className="h-8 w-8" />
        支払う
      </Link>

      <section>
        <div className="mb-2 flex items-center">
          <h2 className="text-sm font-semibold text-mist">最近の取引</h2>
          <Link to="/history" className="ml-auto flex items-center text-xs text-mist">
            すべて見る <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card className="p-0">
          {recent.data && recent.data.length > 0 ? (
            recent.data.map((line) => (
              <TransactionRow
                key={line.id}
                tx={line.transaction}
                amount={line.amount}
                createdAt={line.created_at}
              />
            ))
          ) : (
            <EmptyState title="まだ取引がありません" description="チャージして始めましょう" />
          )}
        </Card>
      </section>
    </div>
  );
}
