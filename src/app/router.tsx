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
                    { path: '/pay', element: <PlaceholderPage title="支払う" /> },
                    { path: '/send', element: <PlaceholderPage title="送る" /> },
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
                  children: [{ path: '/complete/:id', element: <CompletePage /> }],
                },
              ],
            },
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ]
    : [{ path: '*', element: <ConfigErrorPage /> }],
);
