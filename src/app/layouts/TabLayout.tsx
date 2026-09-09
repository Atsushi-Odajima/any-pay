import { NavLink, Outlet } from 'react-router';
import { Home, QrCode, Send, History, Menu } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { to: '/', label: 'ホーム', icon: Home, end: true },
  { to: '/pay', label: '支払う', icon: QrCode },
  { to: '/send', label: '送る', icon: Send },
  { to: '/history', label: '履歴', icon: History },
  { to: '/more', label: 'その他', icon: Menu },
] as const;

export function TabLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 pb-[calc(4.5rem+var(--safe-bottom))]">
        <Outlet />
      </main>
      <nav
        aria-label="メインナビゲーション"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-ink-700 bg-ink/95 backdrop-blur no-print"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <ul className="flex h-16 items-stretch">
          {TABS.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={'end' in t && t.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                    isActive ? 'text-lime' : 'text-mist hover:text-white',
                  )
                }
              >
                <t.icon className="h-6 w-6" />
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
