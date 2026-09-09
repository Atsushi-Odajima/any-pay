import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Landmark, CreditCard, Store, Wallet, Check, ExternalLink } from 'lucide-react';
import {
  AmountInput,
  Button,
  Card,
  ErrorMessage,
  ListRow,
  PageHeader,
  Skeleton,
} from '@/shared/ui';
import { formatYen, LIMITS } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { currentOrigin, navigateExternal } from '@/shared/platform/print';
import { useLocale, useT } from '@/shared/i18n';
import { LEGACY_MENU, menuFromSpecs, type ChargeMenuItem } from '../chargeMethods';
import { useCharge, useChargeMethods, useCreateChargeRequest, useMyWallet } from '../hooks';

type Step = 'method' | 'amount' | 'confirm';

const ICON: Record<string, typeof Landmark> = {
  bank_debit: Landmark,
  bank: Landmark,
  card: CreditCard,
  konbini: Store,
  convenience: Store,
  wallet: Wallet,
  paypay: Wallet,
};

export function ChargePage() {
  const t = useT();
  const [locale] = useLocale();
  const navigate = useNavigate();
  const wallet = useMyWallet();
  const methods = useChargeMethods();
  const charge = useCharge();
  const create = useCreateChargeRequest();
  const [step, setStep] = useState<Step>('method');
  const [item, setItem] = useState<ChargeMenuItem | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // 確認画面に入るたびに1つだけ生成し、リトライでは同じキーを使う
  const idempotencyKey = useMemo(() => newIdempotencyKey('charge'), []);

  const gatewayAvailable = !!methods.data && methods.data.length > 0;
  const menu: ChargeMenuItem[] = gatewayAvailable ? menuFromSpecs(methods.data) : LEGACY_MENU;

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

  const methodLabel = (m: ChargeMenuItem) => t(`charge.methods.${m.method}`);
  const providerLabel = (m: ChargeMenuItem) => t(`charge.providers.${m.provider}`);
  const flowLabel = (m: ChargeMenuItem) =>
    m.flow === 'instant'
      ? t('charge.instant')
      : m.flow === 'instructions'
        ? t('charge.flowInstructions')
        : t('charge.flowRedirect');

  const submit = () => {
    if (amount === null || amountError || !item) return;
    if (item.legacy) {
      charge.mutate(
        { amount, method: item.legacy, idempotencyKey },
        {
          onSuccess: (tx) => {
            vibrate('success');
            navigate(`/complete/${tx.id}`, { replace: true });
          },
          onError: () => vibrate('error'),
        },
      );
      return;
    }
    create.mutate(
      {
        amount,
        channel: item.channel,
        provider: item.provider,
        method: item.method,
        idempotencyKey,
        origin: currentOrigin(),
        locale,
      },
      {
        onSuccess: ({ request, redirectUrl, flow }) => {
          if (flow === 'redirect' && redirectUrl) {
            setRedirecting(true);
            navigateExternal(redirectUrl);
            return;
          }
          navigate(`/charge/pending/${request.id}`, { replace: true });
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
          {methods.isPending ? (
            <Card className="flex flex-col gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </Card>
          ) : (
            <Card className="p-0">
              {menu.map((m) => {
                const Icon = ICON[m.method] ?? Wallet;
                return (
                  <ListRow
                    key={m.key}
                    icon={<Icon className="h-5 w-5" />}
                    title={methodLabel(m)}
                    subtitle={`${providerLabel(m)} · ${flowLabel(m)}`}
                    onClick={() => {
                      setItem(m);
                      setStep('amount');
                    }}
                  />
                );
              })}
            </Card>
          )}
          {!methods.isPending && !gatewayAvailable && (
            <p className="mt-3 text-xs text-warn">{t('charge.gatewayUnavailable')}</p>
          )}
          <p className="mt-4 text-xs text-ink-400">
            {gatewayAvailable ? t('charge.apiNote') : t('charge.demoNote')}
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
            {t('charge.currentBalance', {
              balance: wallet.data ? formatYen(wallet.data.balance_cache) : '—',
            })}
          </p>
          <Button type="submit" size="lg" full disabled={amount === null || !!amountError}>
            {t('common.next')}
          </Button>
        </form>
      )}
      {step === 'confirm' && amount !== null && item && (
        <div className="flex flex-1 flex-col gap-4 px-4">
          <Card>
            <dl className="divide-y divide-ink-700 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-mist">{t('charge.method')}</dt>
                <dd className="text-right">
                  <span className="block">{methodLabel(item)}</span>
                  <span className="block text-xs text-mist">{providerLabel(item)}</span>
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-mist">{t('charge.amount')}</dt>
                <dd className="text-lg font-bold">{formatYen(amount)}</dd>
              </div>
            </dl>
          </Card>
          {!item.legacy && <p className="text-xs text-mist">{t('charge.confirmApiNote')}</p>}
          <ErrorMessage error={charge.error ?? create.error} />
          <Button
            size="lg"
            full
            icon={
              item.legacy ? <Check className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />
            }
            loading={charge.isPending || create.isPending || redirecting}
            onClick={submit}
          >
            {item.legacy
              ? t('charge.submit')
              : item.flow === 'instructions'
                ? t('charge.submitInstructions')
                : t('charge.submitRedirect')}
          </Button>
        </div>
      )}
    </>
  );
}
