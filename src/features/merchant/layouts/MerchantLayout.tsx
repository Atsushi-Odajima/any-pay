import { NavLink, Outlet, Navigate } from 'react-router';
import { ArrowLeft, Home, ScanLine, Receipt, QrCode, Ticket, ArrowUpFromLine } from 'lucide-react';
import { PageLoading } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { useMyMerchant } from '../hooks';

const NAV = [
  { to: '/merchant', key: 'merchant.nav.home', icon: Home, end: true },
  { to: '/merchant/accept', key: 'merchant.nav.accept', icon: ScanLine },
  { to: '/merchant/transactions', key: 'merchant.nav.transactions', icon: Receipt },
  { to: '/merchant/qr', key: 'merchant.nav.qr', icon: QrCode },
  { to: '/merchant/coupons', key: 'merchant.nav.coupons', icon: Ticket },
  { to: '/merchant/withdraw', key: 'merchant.nav.withdraw', icon: ArrowUpFromLine },
] as const;

/** 加盟店ダッシュボードのレイアウト。店舗未登録なら登録画面へ */
export function MerchantLayout() {
  const t = useT();
  const merchant = useMyMerchant();
  if (merchant.isPending) return <PageLoading />;
  if (!merchant.data) return <Navigate to="/merchant/register" replace />;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-ink/90 px-2 backdrop-blur no-print">
        <NavLink
          to="/more"
          aria-label={t('merchant.toUser')}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </NavLink>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{merchant.data.name}</p>
          <p className="text-[11px] text-mist">{t('merchant.dashboard')}</p>
        </div>
      </header>
      <nav
        className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 no-print"
        aria-label={t('merchant.menu')}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={'end' in n && n.end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium',
                isActive ? 'bg-lime text-ink' : 'bg-ink-800 text-mist',
              )
            }
          >
            <n.icon className="h-3.5 w-3.5" />
            {t(n.key)}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 pb-[var(--safe-bottom)]">
        <Outlet context={{ merchant: merchant.data }} />
      </main>
    </div>
  );
}
