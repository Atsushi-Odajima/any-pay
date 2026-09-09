import { createBrowserRouter } from 'react-router';
import { isSupabaseConfigured } from '@/shared/lib/env';
import { TabLayout } from './layouts/TabLayout';
import { PlainLayout } from './layouts/PlainLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { ConfigErrorPage } from './pages/ConfigErrorPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
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
import { SendPage } from '@/features/transfer/pages/SendPage';
import { ReceivePage } from '@/features/transfer/pages/ReceivePage';
import { SplitListPage } from '@/features/transfer/pages/SplitListPage';
import { SplitCreatePage } from '@/features/transfer/pages/SplitCreatePage';
import { SplitDetailPage } from '@/features/transfer/pages/SplitDetailPage';

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
                    { index: true, element: <PlaceholderPage title="店舗ホーム" /> },
                    { path: 'accept', element: <MerchantAcceptRoute /> },
                    { path: 'transactions', element: <PlaceholderPage title="決済一覧" /> },
                    { path: 'qr', element: <PlaceholderPage title="静的QR" /> },
                    { path: 'coupons', element: <PlaceholderPage title="クーポン" /> },
                    { path: 'withdraw', element: <PlaceholderPage title="出金" /> },
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
