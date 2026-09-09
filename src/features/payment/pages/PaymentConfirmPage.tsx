import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Store, Clock, Ticket } from 'lucide-react';
import { useMyWallet } from '@/features/wallet/hooks';
import { useUsableCoupons } from '@/features/rewards/hooks';
import { previewDiscount } from '@/features/rewards/discount';
import { CouponCard } from '@/features/rewards/pages/CouponsPage';
import { useAuthGate } from '@/features/security/hooks';
import { PinGate } from '@/features/security/components/PinGate';
import {
  AmountInput,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  PageLoading,
  Sheet,
} from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatCountdown, secondsUntil } from '@/shared/lib/date';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { useT } from '@/shared/i18n';
import { useMerchant, usePayRequest, usePayStatic, usePaymentRequestView } from '../hooks';

/**
 * 決済確認画面
 *   /pay/confirm/request/:id  動的QR（金額固定）
 *   /pay/confirm/static/:id   静的QR（金額入力）
 */
export function PaymentConfirmPage() {
  const t = useT();
  const { mode, id } = useParams<{ mode: 'request' | 'static'; id: string }>();
  const navigate = useNavigate();
  const wallet = useMyWallet();
  const request = usePaymentRequestView(mode === 'request' ? id : undefined);
  const merchant = useMerchant(mode === 'static' ? id : undefined);
  const payRequest = usePayRequest();
  const payStatic = usePayStatic();
  const [amount, setAmount] = useState<number | null>(null);
  const idempotencyKey = useMemo(() => newIdempotencyKey('pay'), []);
  const merchantIdForCoupon = mode === 'request' ? request.data?.merchant_id : id;
  const couponsQuery = useUsableCoupons(merchantIdForCoupon);
  const coupons = couponsQuery.data ?? [];
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponSheet, setCouponSheet] = useState(false);
  const gate = useAuthGate();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (mode !== 'request' && mode !== 'static') {
    return <EmptyState title={t('payment.invalidUrl')} />;
  }
  if ((mode === 'request' && request.isPending) || (mode === 'static' && merchant.isPending)) {
    return <PageLoading />;
  }
  if (mode === 'request' && request.isError) {
    return (
      <>
        <PageHeader title={t('payment.title')} back="/pay" />
        <div className="px-4">
          <ErrorMessage error={request.error} />
        </div>
      </>
    );
  }
  if (mode === 'static' && !merchant.data) {
    return (
      <>
        <PageHeader title={t('payment.title')} back="/pay" />
        <EmptyState title={t('payment.storeNotFound')} />
      </>
    );
  }

  const merchantName = mode === 'request' ? request.data?.merchant_name : merchant.data?.name;
  const merchantCategory =
    mode === 'request' ? request.data?.merchant_category : merchant.data?.category;
  const fixedAmount = mode === 'request' ? request.data?.amount : undefined;
  const payAmount = mode === 'request' ? (fixedAmount ?? 0) : (amount ?? 0);
  const selectedCoupon = coupons.find((uc) => uc.id === couponId) ?? null;
  const discount = selectedCoupon ? previewDiscount(selectedCoupon.coupon, payAmount) : 0;
  const finalAmount = payAmount - discount;
  const balance = wallet.data?.balance_cache ?? 0;
  const secondsLeft = request.data ? secondsUntil(request.data.expires_at, now) : null;
  const requestClosed = request.data ? request.data.status !== 'open' || secondsLeft === 0 : false;
  const insufficient = finalAmount > balance;
  const pending = payRequest.isPending || payStatic.isPending;
  const error = payRequest.error ?? payStatic.error;

  const submit = () => {
    if (payAmount <= 0 || insufficient) return;
    void gate.run(() => doPay());
  };
  const doPay = () => {
    const onSuccess = (tx: { id: string }) => {
      vibrate('success');
      navigate(`/complete/${tx.id}`, {
        replace: true,
        state: { titleKey: 'complete.payment', subtitle: merchantName, next: '/' },
      });
    };
    const onError = () => vibrate('error');
    if (mode === 'request' && id) {
      payRequest.mutate(
        { requestId: id, idempotencyKey, userCouponId: couponId },
        { onSuccess, onError },
      );
    } else if (mode === 'static' && id) {
      payStatic.mutate(
        { merchantId: id, amount: payAmount, idempotencyKey, userCouponId: couponId },
        { onSuccess, onError },
      );
    }
  };

  const statusBadge = request.data
    ? request.data.status === 'paid'
      ? t('payment.paid')
      : request.data.status === 'cancelled'
        ? t('payment.cancelled')
        : secondsLeft === 0
          ? t('payment.expired')
          : t('payment.remaining', { time: formatCountdown(secondsLeft ?? 0) })
    : null;

  return (
    <>
      <PageHeader title={t('payment.confirmTitle')} back="/pay" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6">
        <Card className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-700">
            <Store className="h-6 w-6 text-lime" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{merchantName}</p>
            {merchantCategory && <p className="text-xs text-mist">{merchantCategory}</p>}
          </div>
          {statusBadge && <Badge tone={requestClosed ? 'danger' : 'lime'}>{statusBadge}</Badge>}
        </Card>

        {mode === 'request' ? (
          <div className="py-4 text-center">
            <p className="text-sm text-mist">{t('payment.amountLabel')}</p>
            <p className="mt-1 text-5xl font-bold tracking-tight">{formatYen(fixedAmount ?? 0)}</p>
            {request.data?.memo && <p className="mt-2 text-sm text-mist">{request.data.memo}</p>}
          </div>
        ) : (
          <AmountInput
            value={amount}
            onChange={setAmount}
            label={t('payment.enterAmount')}
            autoFocus
            error={insufficient ? t('validation.insufficient') : undefined}
          />
        )}

        <button
          type="button"
          onClick={() => setCouponSheet(true)}
          className="flex items-center gap-3 rounded-2xl bg-ink-800 px-4 py-3 text-left hover:bg-ink-700"
        >
          <Ticket className="h-5 w-5 text-lime" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {selectedCoupon ? selectedCoupon.coupon.title : t('payment.useCoupon')}
            </span>
            <span className="block text-xs text-mist">
              {selectedCoupon
                ? discount > 0
                  ? `-${formatYen(discount)}`
                  : t('payment.couponMin')
                : coupons.length > 0
                  ? t('payment.couponAvailable', { n: coupons.length })
                  : t('payment.noCoupon')}
            </span>
          </span>
        </button>

        <Card>
          <dl className="flex flex-col gap-1 text-sm">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-mist">
                  <dt>{t('payment.amount')}</dt>
                  <dd>{formatYen(payAmount)}</dd>
                </div>
                <div className="flex justify-between text-lime">
                  <dt>{t('payment.discount')}</dt>
                  <dd>-{formatYen(discount)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <dt className="text-mist">{t('payment.balanceAfter')}</dt>
              <dd className={insufficient ? 'text-danger' : ''}>
                {formatYen(balance)} → {formatYen(Math.max(0, balance - finalAmount))}
              </dd>
            </div>
          </dl>
        </Card>

        {mode === 'request' && !requestClosed && (
          <p className="flex items-center justify-center gap-1 text-xs text-mist">
            <Clock className="h-3.5 w-3.5" /> {t('payment.dynamicValid')}
          </p>
        )}

        <ErrorMessage error={error} />
        {gate.bioError && <ErrorMessage error={new Error(gate.bioError)} />}
        <div className="mt-auto">
          <Button
            size="lg"
            full
            loading={pending || gate.step === 'biometrics'}
            disabled={payAmount <= 0 || insufficient || requestClosed}
            onClick={submit}
          >
            {t('payment.payButton', { amount: formatYen(finalAmount) })}
          </Button>
        </div>
      </div>

      <Sheet
        open={couponSheet}
        onClose={() => setCouponSheet(false)}
        title={t('payment.selectCoupon')}
      >
        <div className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
          {coupons.length === 0 && (
            <p className="py-4 text-center text-sm text-mist">{t('payment.noCouponForStore')}</p>
          )}
          {coupons.map((uc) => (
            <CouponCard
              key={uc.id}
              coupon={uc.coupon}
              selected={uc.id === couponId}
              onClick={() => {
                setCouponId(uc.id === couponId ? null : uc.id);
                setCouponSheet(false);
              }}
            />
          ))}
          {couponId && (
            <Button
              variant="ghost"
              onClick={() => {
                setCouponId(null);
                setCouponSheet(false);
              }}
            >
              {t('payment.noUseCoupon')}
            </Button>
          )}
        </div>
      </Sheet>
      <PinGate open={gate.step === 'pin'} onClose={gate.cancel} onVerified={gate.onPinVerified} />
    </>
  );
}
