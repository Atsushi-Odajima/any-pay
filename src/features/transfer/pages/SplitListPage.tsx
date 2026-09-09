import { Link } from 'react-router';
import { Plus, Users } from 'lucide-react';
import { useSession } from '@/features/auth/hooks';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, PageLoading } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDate } from '@/shared/lib/date';
import { useMySplits } from '../hooks';

export function SplitListPage() {
  const { userId } = useSession();
  const splits = useMySplits();
  return (
    <>
      <PageHeader
        title="割り勘"
        back="/send"
        right={
          <Link to="/split/new">
            <Button size="sm" icon={<Plus className="h-4 w-4" />}>
              作成
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
            title="割り勘はまだありません"
            description="合計金額とメンバーを指定して作成すると、各メンバーに通知が届きます"
            action={
              <Link to="/split/new">
                <Button>割り勘を作成</Button>
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
                  title={s.memo ?? '割り勘'}
                  subtitle={`${formatDate(s.created_at)} · ${isCreator ? 'あなたが作成' : `${s.creator?.display_name ?? ''} が作成`} · ${paid}/${s.members.length} 人支払い済み`}
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
                        {done ? '完了' : mine && !mine.paid_transaction_id ? '未払い' : '進行中'}
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
