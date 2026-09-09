import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { PageLoading } from '@/shared/ui';
import { isSupabaseConfigured } from '@/shared/lib/env';
import { TabLayout } from './layouts/TabLayout';
import { PlainLayout } from './layouts/PlainLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { ConfigErrorPage } from './pages/ConfigErrorPage';
import { ErrorPage } from './pages/ErrorPage';
import { RequireAuth, RequireNoProfile, RequireProfile } from './guards';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { MorePage } from '@/features/auth/pages/MorePage';
import { HomePage } from '@/features/wallet/pages/HomePage';
import { ChargePage } from '@/features/wallet/pages/ChargePage';
import { WithdrawPage } from '@/features/wallet/pages/WithdrawPage';
import { CompletePage } from '@/features/wallet/pages/CompletePage';
import { StripeReturnPage } from '@/features/wallet/pages/StripeReturnPage';
import { HistoryPage } from '@/features/history/pages/HistoryPage';
import { TransactionDetailPage } from '@/features/history/pages/TransactionDetailPage';
import { PayPage } from '@/features/qr/pages/PayPage';
import { ScanRedirectPage } from '@/features/qr/pages/ScanRedirectPage';
import { PaymentConfirmPage } from '@/features/payment/pages/PaymentConfirmPage';
const MerchantLayout = lazyPage(
  () => import('@/features/merchant/layouts/MerchantLayout'),
  'MerchantLayout',
);
const MerchantRegisterPage = lazyPage(
  () => import('@/features/merchant/pages/MerchantRegisterPage'),
  'MerchantRegisterPage',
);
const MerchantAcceptRoute = lazyPage(
  () => import('@/features/merchant/pages/MerchantAcceptRoute'),
  'MerchantAcceptRoute',
);
const MerchantHomePage = lazyPage(
  () => import('@/features/merchant/pages/MerchantHomePage'),
  'MerchantHomePage',
);
const MerchantTransactionsPage = lazyPage(
  () => import('@/features/merchant/pages/MerchantTransactionsPage'),
  'MerchantTransactionsPage',
);
const MerchantTransactionDetailPage = lazyPage(
  () => import('@/features/merchant/pages/MerchantTransactionDetailPage'),
  'MerchantTransactionDetailPage',
);
const MerchantStaticQrPage = lazyPage(
  () => import('@/features/merchant/pages/MerchantStaticQrPage'),
  'MerchantStaticQrPage',
);
const MerchantWithdrawPage = lazyPage(
  () => import('@/features/merchant/pages/MerchantWithdrawPage'),
  'MerchantWithdrawPage',
);
import { SendPage } from '@/features/transfer/pages/SendPage';
import { ReceivePage } from '@/features/transfer/pages/ReceivePage';
const SplitListPage = lazyPage(
  () => import('@/features/transfer/pages/SplitListPage'),
  'SplitListPage',
);
const SplitCreatePage = lazyPage(
  () => import('@/features/transfer/pages/SplitCreatePage'),
  'SplitCreatePage',
);
const SplitDetailPage = lazyPage(
  () => import('@/features/transfer/pages/SplitDetailPage'),
  'SplitDetailPage',
);
const CouponsPage = lazyPage(() => import('@/features/rewards/pages/CouponsPage'), 'CouponsPage');
const PointsPage = lazyPage(() => import('@/features/rewards/pages/PointsPage'), 'PointsPage');
const MerchantCouponsPage = lazyPage(
  () => import('@/features/rewards/pages/MerchantCouponsPage'),
  'MerchantCouponsPage',
);
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
const SecurityPage = lazyPage(
  () => import('@/features/security/pages/SecurityPage'),
  'SecurityPage',
);
const PinSetupPage = lazyPage(
  () => import('@/features/security/pages/PinSetupPage'),
  'PinSetupPage',
);
const ReconcilePage = lazyPage(
  () => import('@/features/admin/pages/ReconcilePage'),
  'ReconcilePage',
);
const GuideIndexPage = lazyPage(
  () => import('@/features/guide/pages/GuideIndexPage'),
  'GuideIndexPage',
);
const GuidePage = lazyPage(() => import('@/features/guide/pages/GuidePage'), 'GuidePage');

/** 名前付き export のページを React.lazy で遅延読み込みし、Suspense で包む */
function lazyPage(loader: () => Promise<Record<string, unknown>>, name: string): ComponentType {
  const Lazy = lazy(async () => ({ default: (await loader())[name] as ComponentType }));
  return function LazyPage() {
    return (
      <Suspense fallback={<PageLoading />}>
        <Lazy />
      </Suspense>
    );
  };
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <ErrorPage />,
    children: isSupabaseConfigured
      ? [
          {
            element: <PlainLayout />,
            children: [{ path: '/login', element: <LoginPage /> }],
          },
          {
            element: <RequireAuth />,
            children: [
              {
                element: <RequireNoProfile />,
                children: [
                  {
                    element: <PlainLayout />,
                    children: [{ path: '/onboarding', element: <OnboardingPage /> }],
                  },
                ],
              },
              {
                element: <RequireProfile />,
                children: [
                  {
                    element: <TabLayout />,
                    children: [
                      { path: '/', element: <HomePage /> },
                      { path: '/pay', element: <PayPage /> },
                      { path: '/merchant/register', element: <MerchantRegisterPage /> },
                      { path: '/send', element: <SendPage /> },
                      { path: '/receive', element: <ReceivePage /> },
                      { path: '/split', element: <SplitListPage /> },
                      { path: '/split/new', element: <SplitCreatePage /> },
                      { path: '/split/:id', element: <SplitDetailPage /> },
                      { path: '/history', element: <HistoryPage /> },
                      { path: '/history/:id', element: <TransactionDetailPage /> },
                      { path: '/charge', element: <ChargePage /> },
                      { path: '/settings/withdraw', element: <WithdrawPage /> },
                      { path: '/more', element: <MorePage /> },
                      { path: '/settings/profile', element: <ProfilePage /> },
                      { path: '/settings/security', element: <SecurityPage /> },
                      { path: '/settings/security/pin', element: <PinSetupPage /> },
                      { path: '/rewards/coupons', element: <CouponsPage /> },
                      { path: '/rewards/points', element: <PointsPage /> },
                      { path: '/notifications', element: <NotificationsPage /> },
                      { path: '/admin/reconcile', element: <ReconcilePage /> },
                      { path: '/guide', element: <GuideIndexPage /> },
                      { path: '/guide/:id', element: <GuidePage /> },
                    ],
                  },
                  {
                    element: <PlainLayout />,
                    children: [
                      { path: '/complete/:id', element: <CompletePage /> },
                      { path: '/scan', element: <ScanRedirectPage /> },
                      { path: '/charge/stripe/return', element: <StripeReturnPage /> },
                      { path: '/pay/confirm/:mode/:id', element: <PaymentConfirmPage /> },
                    ],
                  },
                  {
                    path: '/merchant',
                    element: <MerchantLayout />,
                    children: [
                      { index: true, element: <MerchantHomePage /> },
                      { path: 'accept', element: <MerchantAcceptRoute /> },
                      { path: 'transactions', element: <MerchantTransactionsPage /> },
                      { path: 'transactions/:id', element: <MerchantTransactionDetailPage /> },
                      { path: 'qr', element: <MerchantStaticQrPage /> },
                      { path: 'coupons', element: <MerchantCouponsPage /> },
                      { path: 'withdraw', element: <MerchantWithdrawPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ]
      : [{ path: '*', element: <ConfigErrorPage /> }],
  },
]);
