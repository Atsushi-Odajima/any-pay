import { createBrowserRouter } from 'react-router';
import { isSupabaseConfigured } from '@/shared/lib/env';
import { TabLayout } from './layouts/TabLayout';
import { PlainLayout } from './layouts/PlainLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { ConfigErrorPage } from './pages/ConfigErrorPage';
import { RequireAuth, RequireNoProfile, RequireProfile } from './guards';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { MorePage } from '@/features/auth/pages/MorePage';
import { HomePage } from '@/features/wallet/pages/HomePage';
import { ChargePage } from '@/features/wallet/pages/ChargePage';
import { WithdrawPage } from '@/features/wallet/pages/WithdrawPage';
import { CompletePage } from '@/features/wallet/pages/CompletePage';
import { HistoryPage } from '@/features/history/pages/HistoryPage';
import { TransactionDetailPage } from '@/features/history/pages/TransactionDetailPage';
import { PayPage } from '@/features/qr/pages/PayPage';
import { ScanRedirectPage } from '@/features/qr/pages/ScanRedirectPage';
import { PaymentConfirmPage } from '@/features/payment/pages/PaymentConfirmPage';
import { MerchantLayout } from '@/features/merchant/layouts/MerchantLayout';
import { MerchantRegisterPage } from '@/features/merchant/pages/MerchantRegisterPage';
import { MerchantAcceptRoute } from '@/features/merchant/pages/MerchantAcceptRoute';
import { MerchantHomePage } from '@/features/merchant/pages/MerchantHomePage';
import { MerchantTransactionsPage } from '@/features/merchant/pages/MerchantTransactionsPage';
import { MerchantTransactionDetailPage } from '@/features/merchant/pages/MerchantTransactionDetailPage';
import { MerchantStaticQrPage } from '@/features/merchant/pages/MerchantStaticQrPage';
import { MerchantWithdrawPage } from '@/features/merchant/pages/MerchantWithdrawPage';
import { SendPage } from '@/features/transfer/pages/SendPage';
import { ReceivePage } from '@/features/transfer/pages/ReceivePage';
import { SplitListPage } from '@/features/transfer/pages/SplitListPage';
import { SplitCreatePage } from '@/features/transfer/pages/SplitCreatePage';
import { SplitDetailPage } from '@/features/transfer/pages/SplitDetailPage';
import { CouponsPage } from '@/features/rewards/pages/CouponsPage';
import { PointsPage } from '@/features/rewards/pages/PointsPage';
import { MerchantCouponsPage } from '@/features/rewards/pages/MerchantCouponsPage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { SecurityPage } from '@/features/security/pages/SecurityPage';
import { PinSetupPage } from '@/features/security/pages/PinSetupPage';

export const router = createBrowserRouter(
  isSupabaseConfigured
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
                  ],
                },
                {
                  element: <PlainLayout />,
                  children: [
                    { path: '/complete/:id', element: <CompletePage /> },
                    { path: '/scan', element: <ScanRedirectPage /> },
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
);
