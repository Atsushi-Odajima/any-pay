import { Link } from 'react-router';
import { Plus, Users } from 'lucide-react';
import { useSession } from '@/features/auth/hooks';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, PageLoading } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDate } from '@/shared/lib/date';
import { useT } from '@/shared/i18n';
import { useMySplits } from '../hooks';

export function SplitListPage() {
  const t = useT();
  const { userId } = useSession();
  const splits = useMySplits();
  return (
    <>
      <PageHeader
        title={t('split.title')}
        back="/send"
        right={
          <Link to="/split/new">
            <Button size="sm" icon={<Plus className="h-4 w-4" />}>
              {t('split.create')}
            </Button>
          </Link>
        }
      />
      <div className="px-4 pb-6">
        {splits.isPending ? (
          <PageLoading />
        ) : !splits.data || splits.data.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title={t('split.empty')}
            description={t('split.emptySub')}
            action={
              <Link to="/split/new">
                <Button>{t('split.createButton')}</Button>
              </Link>
            }
          />
        ) : (
          <Card className="p-0">
            {splits.data.map((s) => {
              const paid = s.members.filter((m) => m.paid_transaction_id).length;
              const mine = s.members.find((m) => m.user_id === userId);
              const isCreator = s.creator_id === userId;
              const done = paid === s.members.length;
              return (
                <ListRow
                  key={s.id}
                  icon={<Users className="h-5 w-5" />}
                  title={s.memo ?? t('split.fallback')}
                  subtitle={`${formatDate(s.created_at)} · ${
                    isCreator
                      ? t('split.createdByYou')
                      : t('split.createdBy', { name: s.creator?.display_name ?? '' })
                  } · ${t('split.paidCount', { paid, total: s.members.length })}`}
                  right={
                    <span className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {formatYen(isCreator ? s.total_amount : (mine?.amount ?? 0))}
                      </span>
                      <Badge
                        tone={
                          done ? 'success' : mine && !mine.paid_transaction_id ? 'warn' : 'neutral'
                        }
                      >
                        {done
                          ? t('split.done')
                          : mine && !mine.paid_transaction_id
                            ? t('split.unpaid')
                            : t('split.inProgress')}
                      </Badge>
                    </span>
                  }
                  to={`/split/${s.id}`}
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
