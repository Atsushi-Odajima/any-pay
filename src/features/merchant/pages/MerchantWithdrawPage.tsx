import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AmountInput, Button, Card, ErrorMessage } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { useMyWallets, useWithdraw } from '@/features/wallet/hooks';
import { useMerchantContext } from '../hooks';

export function MerchantWithdrawPage() {
  const { merchant } = useMerchantContext();
  const navigate = useNavigate();
  const wallets = useMyWallets();
  const withdraw = useWithdraw();
  const [amount, setAmount] = useState<number | null>(null);
  const idempotencyKey = useMemo(() => newIdempotencyKey('mwithdraw'), []);
  const wallet = wallets.data?.find((w) => w.id === merchant.wallet_id);
  const balance = wallet?.balance_cache ?? 0;
  const error =
    amount === null
      ? undefined
      : amount < 1
        ? '1円以上を入力してください'
        : amount > balance
          ? '店舗残高が不足しています'
          : undefined;

  return (
    <form
      className="flex flex-col gap-5 px-4 pb-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount === null || error) return;
        withdraw.mutate(
          { amount, idempotencyKey, walletId: merchant.wallet_id },
          {
            onSuccess: (tx) => {
              vibrate('success');
              navigate(`/complete/${tx.id}`, {
                replace: true,
                state: { title: '売上の出金が完了しました', next: '/merchant' },
              });
            },
            onError: () => vibrate('error'),
          },
        );
      }}
    >
      <Card>
        <p className="text-xs text-mist">出金可能な店舗残高</p>
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
        ※ デモのため手数料 0 円・即時反映。返金に備えて残高を残しておくこともできます。
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
  );
}
