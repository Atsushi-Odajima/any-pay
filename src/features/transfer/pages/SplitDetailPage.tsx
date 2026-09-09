import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, Clock } from 'lucide-react';
import { useSession } from '@/features/auth/hooks';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  ListRow,
  PageHeader,
  PageLoading,
} from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { usePaySplit, useSplit } from '../hooks';
import { useAuthGate } from '@/features/security/hooks';
import { PinGate } from '@/features/security/components/PinGate';

export function SplitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useSession();
  const navigate = useNavigate();
  const split = useSplit(id);
  const pay = usePaySplit();
  const idempotencyKey = useMemo(() => newIdempotencyKey('split'), []);
  const gate = useAuthGate();

  if (split.isPending) return <PageLoading />;
  if (!split.data) {
    return (
      <>
        <PageHeader title="割り勘" back="/split" />
        <EmptyState title="割り勘が見つかりません" />
      </>
    );
  }
  const s = split.data;
  const mine = s.members.find((m) => m.user_id === userId);
  const isCreator = s.creator_id === userId;
  const paidCount = s.members.filter((m) => m.paid_transaction_id).length;
  const done = paidCount === s.members.length;

  return (
    <>
      <PageHeader title="割り勘" back="/split" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="py-2 text-center">
          <p className="text-sm text-mist">{s.memo ?? '割り勘'}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatYen(s.total_amount)}</p>
          <p className="mt-1 text-xs text-mist">
            {formatDateTime(s.created_at)} ·{' '}
            {isCreator
              ? 'あなたが作成'
              : `${s.creator?.display_name ?? ''}（@${s.creator?.handle ?? ''}）が作成`}
          </p>
          <div className="mt-2">
            <Badge tone={done ? 'success' : 'warn'}>
              {done ? '全員支払い済み' : `${paidCount}/${s.members.length} 人支払い済み`}
            </Badge>
          </div>
        </div>

        {mine && !mine.paid_transaction_id && (
          <Card className="flex flex-col gap-3">
            <p className="text-sm">
              あなたの負担額 <span className="text-lg font-bold">{formatYen(mine.amount)}</span>
            </p>
            <ErrorMessage error={pay.error} />
            <Button
              size="lg"
              full
              loading={pay.isPending}
              onClick={() =>
                gate.run(() =>
                  pay.mutate(
                    { memberId: mine.id, idempotencyKey },
                    {
                      onSuccess: (tx) => {
                        vibrate('success');
                        navigate(`/complete/${tx.id}`, {
                          replace: true,
                          state: {
                            title: '割り勘の支払いが完了しました',
                            subtitle: s.memo ?? undefined,
                            next: `/split/${s.id}`,
                          },
                        });
                      },
                      onError: () => vibrate('error'),
                    },
                  ),
                )
              }
            >
              {formatYen(mine.amount)} を支払う
            </Button>
          </Card>
        )}
        <PinGate open={gate.step === 'pin'} onClose={gate.cancel} onVerified={gate.onPinVerified} />

        <Card className="p-0">
          {s.members.map((m) => (
            <ListRow
              key={m.id}
              icon={
                <Avatar
                  name={m.profile?.display_name ?? '?'}
                  url={m.profile?.avatar_url}
                  size="sm"
                />
              }
              title={
                <>
                  {m.profile?.display_name ?? '不明'}
                  {m.user_id === userId && (
                    <span className="ml-1 text-xs text-mist">（あなた）</span>
                  )}
                </>
              }
              subtitle={m.profile ? `@${m.profile.handle}` : undefined}
              right={
                <span className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{formatYen(m.amount)}</span>
                  {m.paid_transaction_id ? (
                    <Badge tone="success">
                      <Check className="mr-0.5 h-3 w-3" /> 支払い済み
                    </Badge>
                  ) : (
                    <Badge tone="neutral">
                      <Clock className="mr-0.5 h-3 w-3" /> 未払い
                    </Badge>
                  )}
                </span>
              }
              to={
                m.paid_transaction_id && (isCreator || m.user_id === userId)
                  ? `/history/${m.paid_transaction_id}`
                  : undefined
              }
              chevron={false}
            />
          ))}
        </Card>
      </div>
    </>
  );
}
