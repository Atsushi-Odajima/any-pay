import { useNavigate } from 'react-router';
import { User, LogOut, Info, ArrowUpFromLine, Store } from 'lucide-react';
import { useMyMerchant } from '@/features/merchant/hooks';
import { Avatar, Card, ListRow, PageHeader, Badge } from '@/shared/ui';
import { useMyProfile, useSignOut } from '../hooks';

export function MorePage() {
  const profile = useMyProfile();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const merchant = useMyMerchant();

  return (
    <>
      <PageHeader title="その他" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {profile.data && (
          <Card className="flex items-center gap-3">
            <Avatar name={profile.data.display_name} url={profile.data.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{profile.data.display_name}</p>
              <p className="truncate text-xs text-mist">@{profile.data.handle}</p>
            </div>
            {profile.data.role !== 'user' && <Badge tone="lime">{profile.data.role}</Badge>}
          </Card>
        )}

        <Card className="p-0">
          <ListRow
            icon={<User className="h-5 w-5" />}
            title="プロフィール"
            to="/settings/profile"
          />
          <ListRow
            icon={<ArrowUpFromLine className="h-5 w-5" />}
            title="出金"
            to="/settings/withdraw"
          />
        </Card>

        <Card className="p-0">
          {merchant.data ? (
            <ListRow
              icon={<Store className="h-5 w-5" />}
              title="加盟店ダッシュボード"
              subtitle={merchant.data.name}
              to="/merchant"
            />
          ) : (
            <ListRow
              icon={<Store className="h-5 w-5" />}
              title="店舗を登録する"
              subtitle="決済の受付・売上管理"
              to="/merchant/register"
            />
          )}
        </Card>

        <Card className="p-0">
          <ListRow
            icon={<Info className="h-5 w-5" />}
            title="このアプリについて"
            subtitle="ポートフォリオ用デモ。実際のお金は動きません"
          />
          <ListRow
            icon={<LogOut className="h-5 w-5" />}
            title={<span className="text-danger">ログアウト</span>}
            onClick={() =>
              signOut.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
            }
            chevron={false}
          />
        </Card>
      </div>
    </>
  );
}
