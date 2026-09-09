import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Landmark, CreditCard, Store, Check, ExternalLink } from 'lucide-react';
import { AmountInput, Button, Card, ErrorMessage, ListRow, PageHeader } from '@/shared/ui';
import { formatYen, LIMITS } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { currentOrigin, navigateExternal } from '@/shared/platform/print';
import { env } from '@/shared/lib/env';
import { useT } from '@/shared/i18n';
import type { ChargeMethod } from '../api';
import { useCharge, useMyWallet, useStripeCheckout } from '../hooks';

type Method = ChargeMethod | 'stripe';
type Step = 'method' | 'amount' | 'confirm';

export function ChargePage() {
  const t = useT();
  const navigate = useNavigate();
  const wallet = useMyWallet();
  const charge = useCharge();
  const stripe = useStripeCheckout();
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<Method>('bank');
  const [amount, setAmount] = useState<number | null>(null);
  // 確認画面に入るたびに1つだけ生成し、リトライでは同じキーを使う
  const idempotencyKey = useMemo(() => newIdempotencyKey('charge'), []);

  const methods: Array<{
    value: Method;
    label: string;
    description: string;
    icon: typeof Landmark;
  }> = [
    { value: 'bank', label: t('charge.bank'), description: t('charge.instant'), icon: Landmark },
    { value: 'card', label: t('charge.card'), description: t('charge.instant'), icon: CreditCard },
    {
      value: 'convenience',
      label: t('charge.convenience'),
      description: t('charge.instant'),
      icon: Store,
    },
    ...(env.stripeEnabled
      ? [
          {
            value: 'stripe' as const,
            label: t('charge.stripe'),
            description: t('charge.stripeSub'),
            icon: ExternalLink,
          },
        ]
      : []),
  ];

  const remainingCap = wallet.data
    ? LIMITS.balanceMax - wallet.data.balance_cache
    : LIMITS.chargeMax;
  const amountError =
    amount === null
      ? undefined
      : amount < LIMITS.chargeMin
        ? t('validation.amountMin1')
        : amount > LIMITS.chargeMax
          ? t('charge.maxPerTime', { amount: formatYen(LIMITS.chargeMax) })
          : amount > remainingCap
            ? t('charge.balanceCap', { amount: formatYen(LIMITS.balanceMax) })
            : undefined;

  const submit = () => {
    if (amount === null || amountError) return;
    if (method === 'stripe') {
      stripe.mutate(
        { amount, origin: currentOrigin() },
        { onSuccess: (url) => navigateExternal(url), onError: () => vibrate('error') },
      );
      return;
    }
    charge.mutate(
      { amount, method, idempotencyKey },
      {
        onSuccess: (tx) => {
          vibrate('success');
          navigate(`/complete/${tx.id}`, { replace: true });
        },
        onError: () => vibrate('error'),
      },
    );
  };

  return (
    <>
      <PageHeader title={t('charge.title')} back={step === 'method' ? '/' : true} />
      {step === 'method' && (
        <div className="px-4">
          <p className="mb-3 text-sm text-mist">{t('charge.chooseMethod')}</p>
          <Card className="p-0">
            {methods.map((m) => (
              <ListRow
                key={m.value}
                icon={<m.icon className="h-5 w-5" />}
                title={m.label}
                subtitle={m.description}
                onClick={() => {
                  setMethod(m.value);
                  setStep('amount');
                }}
              />
            ))}
          </Card>
          <p className="mt-4 text-xs text-ink-400">{t('charge.demoNote')}</p>
        </div>
      )}
      {step === 'amount' && (
        <form
          className="flex flex-1 flex-col gap-6 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (amount !== null && !amountError) setStep('confirm');
          }}
        >
          <AmountInput
            value={amount}
            onChange={setAmount}
            autoFocus
            max={LIMITS.chargeMax}
            error={amountError}
            quickAmounts={[1000, 3000, 5000, 10000, 30000]}
          />
          <p className="text-xs text-mist">
            {t('charge.currentBalance', {
              balance: wallet.data ? formatYen(wallet.data.balance_cache) : '—',
            })}
          </p>
          <Button type="submit" size="lg" full disabled={amount === null || !!amountError}>
            {t('common.next')}
          </Button>
        </form>
      )}
      {step === 'confirm' && amount !== null && (
        <div className="flex flex-1 flex-col gap-4 px-4">
          <Card>
            <dl className="divide-y divide-ink-700 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-mist">{t('charge.method')}</dt>
                <dd>{methods.find((m) => m.value === method)?.label}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-mist">{t('charge.amount')}</dt>
                <dd className="text-lg font-bold">{formatYen(amount)}</dd>
              </div>
            </dl>
          </Card>
          <ErrorMessage error={charge.error ?? stripe.error} />
          <Button
            size="lg"
            full
            icon={<Check className="h-5 w-5" />}
            loading={charge.isPending || stripe.isPending}
            onClick={submit}
          >
            {method === 'stripe' ? t('charge.stripeSubmit') : t('charge.submit')}
          </Button>
        </div>
      )}
    </>
  );
}
