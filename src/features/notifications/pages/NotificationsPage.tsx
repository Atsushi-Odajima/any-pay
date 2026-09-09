import { useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button, Card, EmptyState, ListRow, PageHeader, PageLoading } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/date';
import { cn } from '@/shared/lib/cn';
import { useMarkAllRead, useNotifications } from '../hooks';

function linkFor(n: { type: string; data: unknown }): string | undefined {
  const d = (n.data ?? {}) as { transaction_id?: string; split_request_id?: string };
  if (n.type === 'split_requested' || n.type === 'split_paid')
    return d.split_request_id ? `/split/${d.split_request_id}` : '/split';
  if (n.type === 'payment_received')
    return d.transaction_id ? `/merchant/transactions/${d.transaction_id}` : '/merchant';
  return d.transaction_id ? `/history/${d.transaction_id}` : undefined;
}

export function NotificationsPage() {
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
        title="通知"
        back="/"
        right={
          hasUnread ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<CheckCheck className="h-4 w-4" />}
              onClick={() => markAll.mutate()}
            >
              既読
            </Button>
          ) : undefined
        }
      />
      <div className="px-4 pb-6">
        {list.isPending ? (
          <PageLoading />
        ) : !list.data || list.data.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10" />} title="通知はありません" />
        ) : (
          <Card className="p-0">
            {list.data.map((n) => (
              <ListRow
                key={n.id}
                icon={<Bell className={cn('h-5 w-5', n.read_at === null && 'text-lime')} />}
                title={<span className={cn(n.read_at === null && 'font-semibold')}>{n.title}</span>}
                subtitle={[formatDateTime(n.created_at), n.body].filter(Boolean).join(' · ')}
                to={linkFor(n)}
                chevron={false}
              />
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
