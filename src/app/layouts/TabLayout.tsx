import { NavLink, Outlet } from 'react-router';
import { Home, QrCode, Send, History, Menu } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';

const TABS = [
  { to: '/', key: 'nav.home', icon: Home, end: true },
  { to: '/pay', key: 'nav.pay', icon: QrCode },
  { to: '/send', key: 'nav.send', icon: Send },
  { to: '/history', key: 'nav.history', icon: History },
  { to: '/more', key: 'nav.more', icon: Menu },
] as const;

export function TabLayout() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 pb-[calc(4.5rem+var(--safe-bottom))]">
        <Outlet />
      </main>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-ink-700 bg-ink/95 backdrop-blur no-print"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <ul className="flex h-16 items-stretch">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={'end' in tab && tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                    isActive ? 'text-lime' : 'text-mist hover:text-white',
                  )
                }
              >
                <tab.icon className="h-6 w-6" />
                {t(tab.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
