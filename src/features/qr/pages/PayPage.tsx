import { Link, useNavigate, useSearchParams } from 'react-router';
import { RefreshCw, ScanLine, QrCode as QrIcon, Plus, ChevronRight } from 'lucide-react';
import { useMyProfile } from '@/features/auth/hooks';
import { useMyWallet } from '@/features/wallet/hooks';
import { useNotificationStream } from '@/features/notifications/hooks';
import { Button, ErrorMessage, toast } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { useQrToken } from '../hooks';
import { buildPayload, parsePayload, QrPayloadError } from '../payload';
import { routeForPayload } from '../routing';
import { QrCode } from '../components/QrCode';
import { QrScanner } from '../components/QrScanner';

type Mode = 'show' | 'scan';
const TOKEN_TTL_SEC = 60;

/** 支払うタブ：残高から支払うためのユーザー提示 QR（自動更新）と、店舗 QR のスキャンを切り替える */
export function PayPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'scan' ? 'scan' : 'show';
  const setMode = (m: Mode) => setParams(m === 'scan' ? { mode: 'scan' } : {}, { replace: true });

  const profile = useMyProfile();
  const wallet = useMyWallet();
  const token = useQrToken(mode === 'show');

  // 加盟店側が pay_with_token を完了すると通知が届く → 完了画面へ
  useNotificationStream((n) => {
    if (n.type !== 'payment_sent') return;
    const txId = (n.data as { transaction_id?: string } | null)?.transaction_id;
    if (txId) {
      navigate(`/complete/${txId}`, {
        replace: true,
        state: { titleKey: 'complete.payment', next: '/pay' },
      });
    }
  });

  const onScan = (text: string) => {
    try {
      const p = parsePayload(text);
      const to = routeForPayload(p);
      if (!to) {
        toast.error(t('pay.userQrError'));
        return;
      }
      navigate(to);
    } catch (e) {
      toast.error(e instanceof QrPayloadError ? e.message : t('pay.readFailed'));
    }
  };

  const payload = token.data ? buildPayload({ kind: 'user_token', token: token.data.token }) : null;
  const expired = token.data !== undefined && token.secondsLeft === 0;
  const progress = token.data ? Math.min(100, (token.secondsLeft / TOKEN_TTL_SEC) * 100) : 0;
  const urgent = token.secondsLeft <= 10;

  return (
    <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col">
      <header className="flex items-center gap-3 px-4 pt-[calc(0.75rem+var(--safe-top))] pb-2">
        <div>
          <p className="text-xs text-mist">{t('pay.balanceFrom')}</p>
          <p className="text-2xl font-bold tracking-tight">
            {wallet.data ? formatYen(wallet.data.balance_cache) : '—'}
          </p>
        </div>
        <Link
          to="/charge"
          className="ml-auto flex items-center gap-1 rounded-full bg-ink-700 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5 text-lime" /> {t('pay.charge')}
        </Link>
      </header>

      {mode === 'show' ? (
        <div className="flex flex-1 flex-col items-center gap-4 px-4 pb-4">
          <section
            key={token.data?.token ?? 'pending'}
            className="w-full rounded-3xl bg-white p-5 text-ink shadow-[0_10px_40px_rgba(0,0,0,0.35)] animate-fade-up"
          >
            <div className="mb-3 flex items-center">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-widest text-neutral-500">
                  {t('pay.brand')}
                </p>
                <p className="truncate text-base font-bold">{profile.data?.display_name ?? '—'}</p>
                <p className="truncate text-xs text-neutral-500">@{profile.data?.handle ?? ''}</p>
              </div>
              <span className="ml-auto rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-ink">
                {t('pay.balanceBadge')}
              </span>
            </div>

            <div className="relative mx-auto w-fit">
              <QrCode
                value={expired ? null : payload}
                size={232}
                className="p-0 shadow-none"
                label={t('pay.qrLabel')}
              />
              {(expired || token.isError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-white/90">
                  <p className="text-sm font-semibold">
                    {token.isError ? t('pay.issueFailed') : t('pay.expired')}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => token.refetch()}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    {t('pay.reissue')}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-1000 ease-linear',
                    urgent ? 'bg-danger' : 'bg-lime-600',
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center text-xs text-neutral-600">
                <span>
                  {token.data ? (
                    <>
                      {t('pay.autoRefreshPrefix')}{' '}
                      <span className={cn('font-mono font-bold', urgent && 'text-danger')}>
                        {token.secondsLeft}
                      </span>
                      {t('pay.autoRefreshSuffix')}
                    </>
                  ) : (
                    t('pay.issuing')
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => token.refetch()}
                  className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-ink hover:bg-neutral-100"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', token.isFetching && 'animate-spin')} />{' '}
                  {t('pay.refresh')}
                </button>
              </div>
            </div>
          </section>

          <p className="px-2 text-center text-xs text-mist">{t('pay.showHint')}</p>
          <ErrorMessage error={token.error} />

          <Link
            to="/history"
            className="flex w-full items-center rounded-2xl bg-ink-800 px-4 py-3 text-sm"
          >
            <span>{t('pay.recentPayments')}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-ink-400" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
          <QrScanner onResult={onScan} />
          <p className="text-center text-xs text-mist">{t('pay.scanHint')}</p>
        </div>
      )}

      <div className="sticky bottom-[calc(4.5rem+var(--safe-bottom))] flex justify-center px-4 pb-3 pt-1">
        <div className="flex w-full max-w-xs rounded-full bg-ink-800 p-1 shadow-lg" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'show'}
            onClick={() => setMode('show')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors',
              mode === 'show' ? 'bg-lime text-ink' : 'text-mist',
            )}
          >
            <QrIcon className="h-4 w-4" /> {t('pay.showQr')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'scan'}
            onClick={() => setMode('scan')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors',
              mode === 'scan' ? 'bg-lime text-ink' : 'text-mist',
            )}
          >
            <ScanLine className="h-4 w-4" /> {t('pay.scan')}
          </button>
        </div>
      </div>
    </div>
  );
}
