import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { QrCode, ScanLine, Users, Download } from 'lucide-react';
import { useMyWallet } from '@/features/wallet/hooks';
import { QrScanner } from '@/features/qr/components/QrScanner';
import { parsePayload, QrPayloadError } from '@/features/qr/payload';
import {
  AmountInput,
  Avatar,
  Button,
  Card,
  ErrorMessage,
  Input,
  PageHeader,
  PageLoading,
  toast,
} from '@/shared/ui';
import { formatYen, LIMITS } from '@/shared/lib/money';
import { newIdempotencyKey } from '@/shared/lib/idempotency';
import { vibrate } from '@/shared/platform/haptics';
import type { PublicProfile } from '../api';
import { useProfileByHandle, useTransfer } from '../hooks';
import { ProfilePicker } from '../components/ProfilePicker';
import { useAuthGate } from '@/features/security/hooks';
import { PinGate } from '@/features/security/components/PinGate';

type Step = 'pick' | 'scan' | 'amount' | 'confirm';

/** ?to=<handle>（受取QR経由）の事前解決。解決後に key 付きでフローを起動する */
export function SendPage() {
  const [params] = useSearchParams();
  const toHandle = params.get('to');
  const preset = useProfileByHandle(toHandle);
  if (toHandle && preset.isPending) return <PageLoading />;
  return (
    <SendFlow
      key={toHandle ?? ''}
      initialTo={toHandle ? (preset.data ?? null) : null}
      presetMissing={!!toHandle && !preset.data}
    />
  );
}

function SendFlow({
  initialTo,
  presetMissing,
}: {
  initialTo: PublicProfile | null;
  presetMissing: boolean;
}) {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const wallet = useMyWallet();
  const transfer = useTransfer();
  const [step, setStep] = useState<Step>(initialTo ? 'amount' : 'pick');
  const [to, setTo] = useState<PublicProfile | null>(initialTo);
  const [amount, setAmount] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const idempotencyKey = useMemo(() => newIdempotencyKey('transfer'), []);
  const gate = useAuthGate();

  const balance = wallet.data?.balance_cache ?? 0;
  const amountError =
    amount === null
      ? undefined
      : amount < 1
        ? '1円以上を入力してください'
        : amount > LIMITS.transferMax
          ? `1回の送金上限は ${formatYen(LIMITS.transferMax)} です`
          : amount > balance
            ? '残高が不足しています'
            : undefined;

  const submit = () => {
    if (!to || amount === null || amountError) return;
    void gate.run(() => doTransfer());
  };
  const doTransfer = () => {
    if (!to || amount === null) return;
    transfer.mutate(
      { toHandle: to.handle, amount, memo: memo || undefined, idempotencyKey },
      {
        onSuccess: (tx) => {
          vibrate('success');
          navigate(`/complete/${tx.id}`, {
            replace: true,
            state: {
              title: '送金が完了しました',
              subtitle: `${to.display_name}（@${to.handle}）へ`,
              next: '/send',
            },
          });
        },
        onError: () => vibrate('error'),
      },
    );
  };

  return (
    <>
      <PageHeader
        title={
          step === 'pick' || step === 'scan'
            ? '送る'
            : step === 'amount'
              ? '金額を入力'
              : '送金内容の確認'
        }
        back={step === 'pick' ? undefined : true}
        right={
          step === 'pick' ? (
            <button
              type="button"
              aria-label="QRを読み取る"
              onClick={() => setStep('scan')}
              className="rounded-full p-2 hover:bg-ink-800"
            >
              <ScanLine className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {step === 'pick' && (
          <>
            {presetMissing && <ErrorMessage error={new Error('USER_NOT_FOUND')} />}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/receive"
                className="flex items-center gap-2 rounded-2xl bg-ink-800 p-4 text-sm font-medium hover:bg-ink-700"
              >
                <Download className="h-5 w-5 text-lime" /> 受け取る
              </Link>
              <Link
                to="/split"
                className="flex items-center gap-2 rounded-2xl bg-ink-800 p-4 text-sm font-medium hover:bg-ink-700"
              >
                <Users className="h-5 w-5 text-lime" /> 割り勘
              </Link>
            </div>
            <ProfilePicker
              onSelect={(p) => {
                setTo(p);
                setStep('amount');
              }}
            />
            <Button
              variant="outline"
              full
              icon={<QrCode className="h-5 w-5" />}
              onClick={() => setStep('scan')}
            >
              相手の受取QRを読み取る
            </Button>
          </>
        )}

        {step === 'scan' && (
          <>
            <QrScanner
              onResult={(text) => {
                try {
                  const p = parsePayload(text);
                  if (p.kind !== 'receive') {
                    toast.error('受取用QRコードを読み取ってください');
                    return;
                  }
                  setParams({ to: p.handle });
                  setStep('pick');
                } catch (e) {
                  toast.error(e instanceof QrPayloadError ? e.message : '読み取りに失敗しました');
                }
              }}
            />
            <Button variant="ghost" onClick={() => setStep('pick')}>
              ID で検索する
            </Button>
          </>
        )}

        {(step === 'amount' || step === 'confirm') && to && (
          <Card className="flex items-center gap-3">
            <Avatar name={to.display_name} url={to.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{to.display_name}</p>
              <p className="text-xs text-mist">@{to.handle}</p>
            </div>
            {step === 'amount' && (
              <Button size="sm" variant="ghost" onClick={() => setStep('pick')}>
                変更
              </Button>
            )}
          </Card>
        )}

        {step === 'amount' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (amount !== null && !amountError) setStep('confirm');
            }}
          >
            <AmountInput
              value={amount}
              onChange={setAmount}
              autoFocus
              error={amountError}
              max={LIMITS.transferMax}
              quickAmounts={[500, 1000, 3000, 5000]}
            />
            <Input
              label="メッセージ（任意）"
              placeholder="例：ランチ代ありがとう"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-mist">残高 {formatYen(balance)}</p>
            <Button type="submit" size="lg" full disabled={amount === null || !!amountError}>
              次へ
            </Button>
          </form>
        )}

        {step === 'confirm' && to && amount !== null && (
          <>
            <div className="py-4 text-center">
              <p className="text-sm text-mist">送金額</p>
              <p className="mt-1 text-5xl font-bold tracking-tight">{formatYen(amount)}</p>
              {memo && <p className="mt-2 text-sm text-mist">「{memo}」</p>}
            </div>
            <Card>
              <div className="flex justify-between text-sm">
                <span className="text-mist">送金後の残高</span>
                <span>{formatYen(balance - amount)}</span>
              </div>
            </Card>
            <ErrorMessage error={transfer.error} />
            {gate.bioError && <ErrorMessage error={new Error(gate.bioError)} />}
            <Button
              size="lg"
              full
              loading={transfer.isPending || gate.step === 'biometrics'}
              onClick={submit}
            >
              送金する
            </Button>
          </>
        )}
      </div>
      <PinGate open={gate.step === 'pin'} onClose={gate.cancel} onVerified={gate.onPinVerified} />
    </>
  );
}
