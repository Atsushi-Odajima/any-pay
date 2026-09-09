import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { QrCode } from '@/features/qr/components/QrCode';
import { QrScanner } from '@/features/qr/components/QrScanner';
import { buildPayload, parsePayload, QrPayloadError } from '@/features/qr/payload';
import { parseMeta } from '@/features/history/meta';
import { useTransaction } from '@/features/history/hooks';
import { AmountInput, Button, Card, ErrorMessage, Input, Segmented, toast } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatCountdown, secondsUntil } from '@/shared/lib/date';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import { playSuccessSound } from '@/shared/platform/sound';
import { useInvalidateMoney } from '@/features/wallet/hooks';
import { useT } from '@/shared/i18n';
import type { Merchant, Transaction } from '../api';
import {
  useCancelPaymentRequest,
  useCreatePaymentRequest,
  usePayWithToken,
  usePaymentRequestStatus,
} from '../hooks';

type Mode = 'qr' | 'scan';

export function MerchantAcceptPage({ merchant }: { merchant: Merchant }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('qr');
  const [done, setDone] = useState<Transaction | null>(null);

  if (done) {
    return <AcceptDone tx={done} onNext={() => setDone(null)} />;
  }
  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'qr', label: t('merchant.accept.showQr') },
          { value: 'scan', label: t('merchant.accept.readCustomerQr') },
        ]}
      />
      {mode === 'qr' ? (
        <DynamicQrFlow merchant={merchant} onPaid={setDone} />
      ) : (
        <ScanTokenFlow merchant={merchant} onPaid={setDone} />
      )}
    </div>
  );
}

/** 金額入力 → 動的QR表示 → 支払い待ち */
function DynamicQrFlow({
  merchant,
  onPaid,
}: {
  merchant: Merchant;
  onPaid: (tx: Transaction) => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const create = useCreatePaymentRequest();
  const cancel = useCancelPaymentRequest();
  const status = usePaymentRequestStatus(requestId ?? undefined);
  const invalidate = useInvalidateMoney();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const r = status.data;
    if (r?.status === 'paid' && r.paid_transaction_id) {
      invalidate();
      onPaid({ id: r.paid_transaction_id, amount: r.amount } as Transaction);
    }
  }, [status.data, onPaid, invalidate]);

  if (!requestId) {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (amount === null || amount <= 0) return;
          create.mutate(
            { merchantId: merchant.id, amount, memo: memo || undefined },
            { onSuccess: (r) => setRequestId(r.id) },
          );
        }}
      >
        <AmountInput
          value={amount}
          onChange={setAmount}
          label={t('merchant.accept.amount')}
          autoFocus
          quickAmounts={[500, 1000, 1500, 3000]}
        />
        <Input
          label={t('merchant.accept.memo')}
          placeholder={t('merchant.accept.memoPlaceholder')}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={40}
        />
        <ErrorMessage error={create.error} />
        <Button
          type="submit"
          size="lg"
          full
          loading={create.isPending}
          disabled={amount === null || amount <= 0}
        >
          {t('merchant.accept.showQrButton')}
        </Button>
      </form>
    );
  }

  const r = status.data;
  const secondsLeft = r ? secondsUntil(r.expires_at, now) : 0;
  const closed = !r || r.status !== 'open' || secondsLeft === 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-mist">{t('merchant.accept.showToCustomer')}</p>
      <p className="text-4xl font-bold tracking-tight">{formatYen(r?.amount ?? amount ?? 0)}</p>
      <div className="relative">
        <QrCode
          value={closed ? null : buildPayload({ kind: 'payment_request', requestId })}
          size={240}
        />
        {closed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/70 text-sm">
            {r?.status === 'cancelled'
              ? t('merchant.accept.cancelled')
              : t('merchant.accept.expired')}
          </div>
        )}
      </div>
      <p className="font-mono text-xs text-mist">
        {closed ? '—' : t('merchant.accept.remaining', { time: formatCountdown(secondsLeft) })}
        <span className="ml-2 text-ink-400">{t('merchant.accept.valid5min')}</span>
      </p>
      <ErrorMessage error={cancel.error} />
      <div className="flex w-full gap-3">
        <Button
          variant="secondary"
          full
          icon={<X className="h-4 w-4" />}
          disabled={closed}
          loading={cancel.isPending}
          onClick={() => cancel.mutate(requestId)}
        >
          {t('merchant.accept.cancel')}
        </Button>
        <Button
          variant="outline"
          full
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => setRequestId(null)}
        >
          {t('merchant.accept.reenter')}
        </Button>
      </div>
    </div>
  );
}

/** お客様のQR（ap1:u:）を読む → 金額入力 → pay_with_token */
function ScanTokenFlow({
  merchant,
  onPaid,
}: {
  merchant: Merchant;
  onPaid: (tx: Transaction) => void;
}) {
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const pay = usePayWithToken();
  const idempotencyKey = useMemo(() => newIdempotencyKey('paytoken'), [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <QrScanner
          onResult={(text) => {
            try {
              const p = parsePayload(text);
              if (p.kind !== 'user_token') {
                toast.error(t('merchant.accept.notUserQr'));
                return;
              }
              setToken(p.token);
            } catch (e) {
              toast.error(e instanceof QrPayloadError ? e.message : t('pay.readFailed'));
            }
          }}
        />
        <p className="text-center text-xs text-mist">{t('merchant.accept.readHint')}</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount === null || amount <= 0) return;
        pay.mutate(
          { token, amount, merchantId: merchant.id, idempotencyKey },
          { onSuccess: (tx) => onPaid(tx), onError: () => vibrate('error') },
        );
      }}
    >
      <Card className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-lime" /> {t('merchant.accept.readOk')}
      </Card>
      <AmountInput
        value={amount}
        onChange={setAmount}
        label={t('merchant.accept.amount')}
        autoFocus
        quickAmounts={[500, 1000, 1500, 3000]}
      />
      <ErrorMessage error={pay.error} />
      <Button
        type="submit"
        size="lg"
        full
        loading={pay.isPending}
        disabled={amount === null || amount <= 0}
      >
        {amount
          ? t('merchant.accept.payButton', { amount: formatYen(amount) })
          : t('merchant.accept.pay')}
      </Button>
      <Button variant="ghost" onClick={() => setToken(null)}>
        {t('merchant.accept.rescan')}
      </Button>
    </form>
  );
}

function AcceptDone({ tx, onNext }: { tx: Transaction; onNext: () => void }) {
  const t = useT();
  useEffect(() => {
    playSuccessSound();
    vibrate('success');
  }, []);
  // 動的QR経由ではポーリング結果（id と金額のみ）しか無いので、明細を取得して支払者名を出す
  const detail = useTransaction(tx.metadata ? undefined : tx.id);
  const meta = parseMeta(detail.data?.metadata ?? tx.metadata ?? {});
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-10 text-center">
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-lime/40 animate-ring" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-lime text-ink animate-pop">
          <Check className="h-12 w-12" strokeWidth={3} />
        </div>
      </div>
      <h2 className="text-xl font-bold">{t('merchant.accept.done')}</h2>
      <p className="text-4xl font-bold tracking-tight">{formatYen(tx.amount)}</p>
      {meta.payer_name && (
        <p className="text-sm text-mist">
          {meta.payer_name}
          {meta.payer_handle ? ` (@${meta.payer_handle})` : ''}
        </p>
      )}
      <Button size="lg" full className="mt-6" onClick={onNext}>
        {t('merchant.accept.nextSale')}
      </Button>
    </div>
  );
}
