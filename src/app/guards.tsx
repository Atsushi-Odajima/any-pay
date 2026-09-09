import { Navigate, Outlet, useLocation } from 'react-router';
import { useMyProfile, useSession } from '@/features/auth/hooks';
import { PageLoading } from '@/shared/ui';

/** ログイン必須。未ログインは /login へ */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return <PageLoading label="認証を確認中…" />;
  if (status === 'signed_out')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** プロフィール作成済み必須。未作成は /onboarding へ */
export function RequireProfile() {
  const profile = useMyProfile();
  if (profile.isPending) return <PageLoading />;
  if (profile.isError) {
    return (
      <div className="p-6 text-sm text-danger">
        プロフィールの取得に失敗しました。再読み込みしてください。
      </div>
    );
  }
  if (profile.data === null) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** オンボーディング画面用：プロフィール済みならホームへ */
export function RequireNoProfile() {
  const profile = useMyProfile();
  if (profile.isPending) return <PageLoading />;
  if (profile.data) return <Navigate to="/" replace />;
  return <Outlet />;
}
