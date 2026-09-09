import { createBrowserRouter } from 'react-router';
import { TabLayout } from './layouts/TabLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export const router = createBrowserRouter([
  {
    element: <TabLayout />,
    children: [
      { path: '/', element: <PlaceholderPage title="ホーム" /> },
      { path: '/pay', element: <PlaceholderPage title="支払う" /> },
      { path: '/send', element: <PlaceholderPage title="送る" /> },
      { path: '/history', element: <PlaceholderPage title="履歴" /> },
      { path: '/more', element: <PlaceholderPage title="その他" /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
