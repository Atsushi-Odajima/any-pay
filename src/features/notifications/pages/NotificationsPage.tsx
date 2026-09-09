import { useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button, Card, EmptyState, ListRow, PageHeader, PageLoading } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/date';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { useMarkAllRead, useNotifications } from '../hooks';
import { describeNotification } from '../format';

function linkFor(n: { type: string; data: unknown }): string | undefined {
  const d = (n.data ?? {}) as { transaction_id?: string; split_request_id?: string };
  if (n.type === 'split_requested' || n.type === 'split_paid')
    return d.split_request_id ? `/split/${d.split_request_id}` : '/split';
  if (n.type === 'payment_received')
    return d.transaction_id ? `/merchant/transactions/${d.transaction_id}` : '/merchant';
  return d.transaction_id ? `/history/${d.transaction_id}` : undefined;
}

export function NotificationsPage() {
  const t = useT();
  const list = useNotifications();
  const markAll = useMarkAllRead();
  const hasUnread = (list.data ?? []).some((n) => n.read_at === null);

  // 画面を開いたら既読にする
  useEffect(() => {
    if (hasUnread && !markAll.isPending) markAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        back="/"
        right={
          hasUnread ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<CheckCheck className="h-4 w-4" />}
              onClick={() => markAll.mutate()}
            >
              {t('notifications.markAll')}
            </Button>
          ) : undefined
        }
      />
      <div className="px-4 pb-6">
        {list.isPending ? (
          <PageLoading />
        ) : !list.data || list.data.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10" />} title={t('notifications.empty')} />
        ) : (
          <Card className="p-0">
            {list.data.map((n) => {
              const { title, body } = describeNotification(n);
              return (
                <ListRow
                  key={n.id}
                  icon={<Bell className={cn('h-5 w-5', n.read_at === null && 'text-lime')} />}
                  title={<span className={cn(n.read_at === null && 'font-semibold')}>{title}</span>}
                  subtitle={[formatDateTime(n.created_at), body].filter(Boolean).join(' · ')}
                  to={linkFor(n)}
                  chevron={false}
                />
              );
            })}
          </Card>
        )}
      </div>
    </>
  );
}
