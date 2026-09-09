import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AmountInput, Button, Card, ErrorMessage, PageHeader } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { useT } from '@/shared/i18n';
import { useMyWallet, useWithdraw } from '../hooks';

export function WithdrawPage() {
  const t = useT();
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
        ? t('validation.amountMin1')
        : amount > balance
          ? t('validation.insufficient')
          : undefined;

  return (
    <>
      <PageHeader title={t('withdraw.title')} back="/more" />
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
                navigate(`/complete/${tx.id}`, { replace: true });
              },
              onError: () => vibrate('error'),
            },
          );
        }}
      >
        <Card>
          <p className="text-xs text-mist">{t('withdraw.available')}</p>
          <p className="text-2xl font-bold">{formatYen(balance)}</p>
        </Card>
        <AmountInput value={amount} onChange={setAmount} error={error} autoFocus />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAmount(balance)}
          disabled={balance === 0}
        >
          {t('withdraw.all')}
        </Button>
        <p className="text-xs text-ink-400">{t('withdraw.demoNote')}</p>
        <ErrorMessage error={withdraw.error} />
        <Button
          type="submit"
          size="lg"
          full
          loading={withdraw.isPending}
          disabled={amount === null || !!error}
        >
          {t('withdraw.submit')}
        </Button>
      </form>
    </>
  );
}
