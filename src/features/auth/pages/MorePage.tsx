import { useNavigate } from 'react-router';
import {
  User,
  LogOut,
  Info,
  ArrowUpFromLine,
  Store,
  Ticket,
  Coins,
  Bell,
  ShieldCheck,
  Scale,
  Languages,
  BookOpen,
} from 'lucide-react';
import { useMyMerchant } from '@/features/merchant/hooks';
import { Avatar, Card, ListRow, PageHeader, Badge, LanguageToggle } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { useMyProfile, useSignOut } from '../hooks';

export function MorePage() {
  const t = useT();
  const profile = useMyProfile();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const merchant = useMyMerchant();

  return (
    <>
      <PageHeader title={t('more.title')} />
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
            icon={<Ticket className="h-5 w-5" />}
            title={t('more.coupons')}
            to="/rewards/coupons"
          />
          <ListRow
            icon={<Coins className="h-5 w-5" />}
            title={t('more.points')}
            to="/rewards/points"
          />
          <ListRow
            icon={<Bell className="h-5 w-5" />}
            title={t('more.notifications')}
            to="/notifications"
          />
        </Card>

        <Card className="p-0">
          <ListRow
            icon={<User className="h-5 w-5" />}
            title={t('more.profile')}
            to="/settings/profile"
          />
          <ListRow
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t('more.security')}
            to="/settings/security"
          />
          <ListRow
            icon={<ArrowUpFromLine className="h-5 w-5" />}
            title={t('more.withdraw')}
            to="/settings/withdraw"
          />
          <ListRow
            icon={<Languages className="h-5 w-5" />}
            title={t('more.language')}
            right={<LanguageToggle />}
            chevron={false}
          />
        </Card>

        <Card className="p-0">
          {merchant.data ? (
            <ListRow
              icon={<Store className="h-5 w-5" />}
              title={t('more.merchantDashboard')}
              subtitle={merchant.data.name}
              to="/merchant"
            />
          ) : (
            <ListRow
              icon={<Store className="h-5 w-5" />}
              title={t('more.registerStore')}
              subtitle={t('more.registerStoreSub')}
              to="/merchant/register"
            />
          )}
        </Card>

        {profile.data?.role === 'admin' && (
          <Card className="p-0">
            <ListRow
              icon={<Scale className="h-5 w-5" />}
              title={t('more.reconcile')}
              subtitle={t('more.reconcileSub')}
              to="/admin/reconcile"
            />
          </Card>
        )}

        <Card className="p-0">
          <ListRow
            icon={<BookOpen className="h-5 w-5" />}
            title={t('more.guide')}
            subtitle={t('more.guideSub')}
            to="/guide"
          />
          <ListRow
            icon={<Info className="h-5 w-5" />}
            title={t('more.about')}
            subtitle={t('more.aboutSub')}
          />
          <ListRow
            icon={<LogOut className="h-5 w-5" />}
            title={<span className="text-danger">{t('more.logout')}</span>}
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
