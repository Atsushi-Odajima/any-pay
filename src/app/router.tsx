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
                    { path: '/', element: <PlaceholderPage title="ホーム" /> },
                    { path: '/pay', element: <PlaceholderPage title="支払う" /> },
                    { path: '/send', element: <PlaceholderPage title="送る" /> },
                    { path: '/history', element: <PlaceholderPage title="履歴" /> },
                    { path: '/more', element: <MorePage /> },
                    { path: '/settings/profile', element: <ProfilePage /> },
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
