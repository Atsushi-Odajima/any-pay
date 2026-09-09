import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw, ScanLine, QrCode as QrIcon } from 'lucide-react';
import { useMyProfile } from '@/features/auth/hooks';
import { useMyWallet } from '@/features/wallet/hooks';
import { useNotificationStream } from '@/features/notifications/hooks';
import { Button, ErrorMessage, PageHeader, Segmented, toast } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { cn } from '@/shared/lib/cn';
import { useQrToken } from '../hooks';
import { buildPayload, parsePayload, QrPayloadError } from '../payload';
import { routeForPayload } from '../routing';
import { QrCode } from '../components/QrCode';
import { QrScanner } from '../components/QrScanner';

type Mode = 'show' | 'scan';

export function PayPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('show');
  const profile = useMyProfile();
  const wallet = useMyWallet();
  const token = useQrToken(mode === 'show');

  // 加盟店側が pay_with_token を完了すると通知が届く → 完了画面へ
  useNotificationStream((n) => {
    if (n.type !== 'payment_sent') return;
    const txId = (n.data as { transaction_id?: string } | null)?.transaction_id;
    if (txId)
      navigate(`/complete/${txId}`, {
        replace: true,
        state: { title: '支払いが完了しました', next: '/pay' },
      });
  });

  const onScan = (text: string) => {
    try {
      const p = parsePayload(text);
      const to = routeForPayload(p);
      if (!to) {
        toast.error('これはユーザー提示用のQRです。店舗の受付画面で読み取ってください');
        return;
      }
      navigate(to);
    } catch (e) {
      toast.error(e instanceof QrPayloadError ? e.message : '読み取りに失敗しました');
    }
  };

  const payload = token.data ? buildPayload({ kind: 'user_token', token: token.data.token }) : null;
  const expired = token.data !== undefined && token.secondsLeft === 0;

  return (
    <>
      <PageHeader title="支払う" />
      <div className="flex flex-col gap-4 px-4 pb-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'show', label: 'QRを見せる' },
            { value: 'scan', label: 'スキャンする' },
          ]}
        />

        {mode === 'show' ? (
          <div className="flex flex-col items-center gap-4 pt-2">
            <p className="text-sm text-mist">
              残高{' '}
              <span className="font-semibold text-white">
                {wallet.data ? formatYen(wallet.data.balance_cache) : '—'}
              </span>
            </p>
            <div className="relative">
              <QrCode value={expired ? null : payload} size={240} label="支払い用QRコード" />
              {(expired || token.isError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-black/70">
                  <p className="text-sm">{token.isError ? '発行に失敗しました' : '有効期限切れ'}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => token.refetch()}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    再発行
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-mono text-xs',
                  token.secondsLeft <= 10 ? 'bg-danger/20 text-danger' : 'bg-ink-700 text-mist',
                )}
              >
                {token.data ? `${token.secondsLeft}s` : '…'}
              </span>
              <span className="text-mist">60秒ごとに自動更新・1回限り有効</span>
              <button
                type="button"
                aria-label="QRを更新"
                onClick={() => token.refetch()}
                className="rounded-full p-1.5 text-mist hover:bg-ink-800"
              >
                <RefreshCw className={cn('h-4 w-4', token.isFetching && 'animate-spin')} />
              </button>
            </div>
            <p className="text-center text-xs text-ink-400">
              @{profile.data?.handle} ・
              店舗のスキャンで金額が確定すると自動的に完了画面に切り替わります
            </p>
            <ErrorMessage error={token.error} />
            <Button
              variant="outline"
              full
              icon={<ScanLine className="h-5 w-5" />}
              onClick={() => setMode('scan')}
            >
              店舗のQRを読み取る
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <QrScanner onResult={onScan} />
            <p className="text-center text-xs text-mist">
              店舗のQRコード、または相手の受取QRを枠内に合わせてください
            </p>
            <Button
              variant="outline"
              full
              icon={<QrIcon className="h-5 w-5" />}
              onClick={() => setMode('show')}
            >
              自分のQRを見せる
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
