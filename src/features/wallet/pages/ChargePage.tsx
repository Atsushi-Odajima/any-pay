import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Landmark, CreditCard, Store, Check } from 'lucide-react';
import { AmountInput, Button, Card, ErrorMessage, ListRow, PageHeader } from '@/shared/ui';
import { formatYen, LIMITS } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import type { ChargeMethod } from '../api';
import { useCharge, useMyWallet } from '../hooks';

const METHODS: Array<{
  value: ChargeMethod;
  label: string;
  description: string;
  icon: typeof Landmark;
}> = [
  { value: 'bank', label: '銀行口座', description: 'デモ：即時反映', icon: Landmark },
  { value: 'card', label: 'クレジットカード', description: 'デモ：即時反映', icon: CreditCard },
  { value: 'convenience', label: 'コンビニ', description: 'デモ：即時反映', icon: Store },
];

type Step = 'method' | 'amount' | 'confirm';

export function ChargePage() {
  const navigate = useNavigate();
  const wallet = useMyWallet();
  const charge = useCharge();
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<ChargeMethod>('bank');
  const [amount, setAmount] = useState<number | null>(null);
  // 確認画面に入るたびに1つだけ生成し、リトライでは同じキーを使う
  const idempotencyKey = useMemo(() => newIdempotencyKey('charge'), []);

  const remainingCap = wallet.data
    ? LIMITS.balanceMax - wallet.data.balance_cache
    : LIMITS.chargeMax;
  const amountError =
    amount === null
      ? undefined
      : amount < LIMITS.chargeMin
        ? '1円以上を入力してください'
        : amount > LIMITS.chargeMax
          ? `1回のチャージ上限は ${formatYen(LIMITS.chargeMax)} です`
          : amount > remainingCap
            ? `残高上限 ${formatYen(LIMITS.balanceMax)} を超えます`
            : undefined;

  const submit = () => {
    if (amount === null || amountError) return;
    charge.mutate(
      { amount, method, idempotencyKey },
      {
        onSuccess: (tx) => {
          vibrate('success');
          navigate(`/complete/${tx.id}`, { replace: true, state: { kind: 'charge' } });
        },
        onError: () => vibrate('error'),
      },
    );
  };

  return (
    <>
      <PageHeader title="チャージ" back={step === 'method' ? '/' : true} />
      {step === 'method' && (
        <div className="px-4">
          <p className="mb-3 text-sm text-mist">チャージ方法を選択</p>
          <Card className="p-0">
            {METHODS.map((m) => (
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
          <p className="mt-4 text-xs text-ink-400">
            ※ ポートフォリオ用デモのため、実際の入金は発生しません。残高は架空です。
          </p>
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
            現在の残高 {wallet.data ? formatYen(wallet.data.balance_cache) : '—'}
          </p>
          <Button type="submit" size="lg" full disabled={amount === null || !!amountError}>
            次へ
          </Button>
        </form>
      )}
      {step === 'confirm' && amount !== null && (
        <div className="flex flex-1 flex-col gap-4 px-4">
          <Card>
            <dl className="divide-y divide-ink-700 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-mist">チャージ方法</dt>
                <dd>{METHODS.find((m) => m.value === method)?.label}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-mist">チャージ金額</dt>
                <dd className="text-lg font-bold">{formatYen(amount)}</dd>
              </div>
            </dl>
          </Card>
          <ErrorMessage error={charge.error} />
          <Button
            size="lg"
            full
            icon={<Check className="h-5 w-5" />}
            loading={charge.isPending}
            onClick={submit}
          >
            チャージする
          </Button>
        </div>
      )}
    </>
  );
}
