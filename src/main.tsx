import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from '@/app/App';
import { onAppForeground } from '@/shared/platform/document';

// autoUpdate：新しい Service Worker が有効になると自動で再読み込みされる。
// 開きっぱなしのタブ / ホーム画面アプリでも新版が当たるよう、前面復帰時と 1 時間ごとに更新を確認する
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => void registration.update().catch(() => undefined);
    setInterval(check, 60 * 60 * 1000);
    onAppForeground(check);
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
