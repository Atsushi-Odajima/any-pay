import { Outlet } from 'react-router';
import { BrandBar } from '@/shared/ui';

/** 下タブなしの全画面レイアウト（決済確認・完了、オンボーディングなど） */
export function PlainLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <BrandBar />
      <main className="flex flex-1 flex-col pb-[var(--safe-bottom)]">
        <Outlet />
      </main>
    </div>
  );
}
