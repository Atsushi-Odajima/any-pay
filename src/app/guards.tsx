import { Navigate, Outlet, useLocation } from 'react-router';
import { useMyProfile, useSession } from '@/features/auth/hooks';
import { PageLoading } from '@/shared/ui';
import { NotificationListener } from '@/features/notifications/NotificationListener';
import { useT } from '@/shared/i18n';

/** ログイン必須。未ログインは /login へ */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  const t = useT();
  if (status === 'loading') return <PageLoading label={t('pages.authChecking')} />;
  if (status === 'signed_out')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** プロフィール作成済み必須。未作成は /onboarding へ */
export function RequireProfile() {
  const profile = useMyProfile();
  const t = useT();
  if (profile.isPending) return <PageLoading />;
  if (profile.isError) {
    return <div className="p-6 text-sm text-danger">{t('pages.profileFailed')}</div>;
  }
  if (profile.data === null) return <Navigate to="/onboarding" replace />;
  return (
    <>
      <NotificationListener />
      <Outlet />
    </>
  );
}

/** オンボーディング画面用：プロフィール済みならホームへ */
export function RequireNoProfile() {
  const profile = useMyProfile();
  if (profile.isPending) return <PageLoading />;
  if (profile.data) return <Navigate to="/" replace />;
  return <Outlet />;
}
