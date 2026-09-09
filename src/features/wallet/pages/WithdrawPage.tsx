import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AmountInput, Button, Card, ErrorMessage, PageHeader } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { useMyWallet, useWithdraw } from '../hooks';

export function WithdrawPage() {
  const navigate = useNavigate();
  const wallet = useMyWallet();
  const withdraw = useWithdraw();
  const [amount, setAmount] = useState<number | null>(null);
  const idempotencyKey = useMemo(() => newIdempotencyKey('withdraw'), []);
  const balance = wallet.data?.balance_cache ?? 0;
  const error =
    amount === null
      ? undefined
      : amount < 1
        ? '1円以上を入力してください'
        : amount > balance
          ? '残高が不足しています'
          : undefined;

  return (
    <>
      <PageHeader title="出金" back="/more" />
      <form
        className="flex flex-col gap-5 px-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (amount === null || error) return;
          withdraw.mutate(
            { amount, idempotencyKey },
            {
              onSuccess: (tx) => {
                vibrate('success');
                navigate(`/complete/${tx.id}`, { replace: true, state: { kind: 'withdrawal' } });
              },
              onError: () => vibrate('error'),
            },
          );
        }}
      >
        <Card>
          <p className="text-xs text-mist">出金可能残高</p>
          <p className="text-2xl font-bold">{formatYen(balance)}</p>
        </Card>
        <AmountInput value={amount} onChange={setAmount} error={error} autoFocus />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmount(balance)}
          disabled={balance === 0}
        >
          全額を入力
        </Button>
        <p className="text-xs text-ink-400">
          ※ デモのため手数料 0 円・即時反映。実際の送金は行われません。
        </p>
        <ErrorMessage error={withdraw.error} />
        <Button
          type="submit"
          size="lg"
          full
          loading={withdraw.isPending}
          disabled={amount === null || !!error}
        >
          出金する
        </Button>
      </form>
    </>
  );
}
