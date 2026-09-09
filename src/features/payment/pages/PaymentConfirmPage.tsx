import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Store, Clock } from 'lucide-react';
import { useMyWallet } from '@/features/wallet/hooks';
import {
  AmountInput,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  PageLoading,
} from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { secondsUntil } from '@/shared/lib/date';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { useMerchant, usePayRequest, usePayStatic, usePaymentRequestView } from '../hooks';

/**
 * 決済確認画面
 *   /pay/confirm/request/:id  動的QR（金額固定）
 *   /pay/confirm/static/:id   静的QR（金額入力）
 */
export function PaymentConfirmPage() {
  const { mode, id } = useParams<{ mode: 'request' | 'static'; id: string }>();
  const navigate = useNavigate();
  const wallet = useMyWallet();
  const request = usePaymentRequestView(mode === 'request' ? id : undefined);
  const merchant = useMerchant(mode === 'static' ? id : undefined);
  const payRequest = usePayRequest();
  const payStatic = usePayStatic();
  const [amount, setAmount] = useState<number | null>(null);
  const idempotencyKey = useMemo(() => newIdempotencyKey('pay'), []);

  // 動的QRの残り時間
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (mode !== 'request' && mode !== 'static') {
    return <EmptyState title="不正なURLです" />;
  }
  if ((mode === 'request' && request.isPending) || (mode === 'static' && merchant.isPending)) {
    return <PageLoading />;
  }
  if (mode === 'request' && request.isError) {
    return (
      <>
        <PageHeader title="支払い" back="/pay" />
        <div className="px-4">
          <ErrorMessage error={request.error} />
        </div>
      </>
    );
  }
  if (mode === 'static' && !merchant.data) {
    return (
      <>
        <PageHeader title="支払い" back="/pay" />
        <EmptyState title="店舗が見つかりません" />
      </>
    );
  }

  const merchantName = mode === 'request' ? request.data?.merchant_name : merchant.data?.name;
  const merchantCategory =
    mode === 'request' ? request.data?.merchant_category : merchant.data?.category;
  const fixedAmount = mode === 'request' ? request.data?.amount : undefined;
  const payAmount = mode === 'request' ? (fixedAmount ?? 0) : (amount ?? 0);
  const balance = wallet.data?.balance_cache ?? 0;
  const secondsLeft = request.data ? secondsUntil(request.data.expires_at, now) : null;
  const requestClosed = request.data ? request.data.status !== 'open' || secondsLeft === 0 : false;
  const insufficient = payAmount > balance;
  const pending = payRequest.isPending || payStatic.isPending;
  const error = payRequest.error ?? payStatic.error;

  const submit = () => {
    if (payAmount <= 0 || insufficient) return;
    const onSuccess = (tx: { id: string }) => {
      vibrate('success');
      navigate(`/complete/${tx.id}`, {
        replace: true,
        state: { title: '支払いが完了しました', subtitle: merchantName, next: '/' },
      });
    };
    const onError = () => vibrate('error');
    if (mode === 'request' && id) {
      payRequest.mutate({ requestId: id, idempotencyKey }, { onSuccess, onError });
    } else if (mode === 'static' && id) {
      payStatic.mutate(
        { merchantId: id, amount: payAmount, idempotencyKey },
        { onSuccess, onError },
      );
    }
  };

  return (
    <>
      <PageHeader title="支払い内容の確認" back="/pay" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6">
        <Card className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-700">
            <Store className="h-6 w-6 text-lime" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{merchantName}</p>
            {merchantCategory && <p className="text-xs text-mist">{merchantCategory}</p>}
          </div>
          {mode === 'request' && request.data && (
            <Badge tone={requestClosed ? 'danger' : 'lime'}>
              {request.data.status === 'paid'
                ? '支払い済み'
                : request.data.status === 'cancelled'
                  ? 'キャンセル'
                  : secondsLeft === 0
                    ? '期限切れ'
                    : `残り ${Math.floor((secondsLeft ?? 0) / 60)}:${String((secondsLeft ?? 0) % 60).padStart(2, '0')}`}
            </Badge>
          )}
        </Card>

        {mode === 'request' ? (
          <div className="py-4 text-center">
            <p className="text-sm text-mist">お支払い金額</p>
            <p className="mt-1 text-5xl font-bold tracking-tight">{formatYen(fixedAmount ?? 0)}</p>
            {request.data?.memo && <p className="mt-2 text-sm text-mist">{request.data.memo}</p>}
          </div>
        ) : (
          <AmountInput
            value={amount}
            onChange={setAmount}
            label="お支払い金額を入力"
            autoFocus
            error={insufficient ? '残高が不足しています' : undefined}
          />
        )}

        <Card>
          <div className="flex justify-between text-sm">
            <span className="text-mist">支払い後の残高</span>
            <span className={insufficient ? 'text-danger' : ''}>
              {formatYen(balance)} → {formatYen(Math.max(0, balance - payAmount))}
            </span>
          </div>
        </Card>

        {mode === 'request' && !requestClosed && (
          <p className="flex items-center justify-center gap-1 text-xs text-mist">
            <Clock className="h-3.5 w-3.5" /> 店舗提示QRは発行から5分間有効です
          </p>
        )}

        <ErrorMessage error={error} />
        <div className="mt-auto">
          <Button
            size="lg"
            full
            loading={pending}
            disabled={payAmount <= 0 || insufficient || requestClosed}
            onClick={submit}
          >
            {formatYen(payAmount)} を支払う
          </Button>
        </div>
      </div>
    </>
  );
}
