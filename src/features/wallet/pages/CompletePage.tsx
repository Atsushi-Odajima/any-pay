import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Check } from 'lucide-react';
import { useTransaction } from '@/features/history/hooks';
import { txTypeLabel } from '@/features/history/labels';
import { Button, PageLoading } from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { playSuccessSound } from '@/shared/platform/sound';
import { vibrate } from '@/shared/platform/haptics';
import { useT } from '@/shared/i18n';

/** 取引完了画面（チャージ / 出金 / 決済 / 送金 共通） */
export function CompletePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const tx = useTransaction(id);
  const state = (location.state ?? {}) as { titleKey?: string; subtitle?: string; next?: string };

  useEffect(() => {
    playSuccessSound();
    vibrate('success');
  }, []);

  if (tx.isPending) return <PageLoading />;

  const title = state.titleKey
    ? t(state.titleKey)
    : tx.data
      ? t('complete.done', { type: txTypeLabel(tx.data.type) })
      : '';

  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-[calc(4rem+var(--safe-top))] pb-8 text-center">
      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full bg-lime/40 animate-ring" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-lime text-ink animate-pop">
          <Check className="h-12 w-12" strokeWidth={3} />
        </div>
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      {tx.data && (
        <>
          <p className="mt-4 text-4xl font-bold tracking-tight">{formatYen(tx.data.amount)}</p>
          {state.subtitle && <p className="mt-2 text-sm text-mist">{state.subtitle}</p>}
          <p className="mt-2 text-xs text-mist">
            {formatDateTime(tx.data.completed_at ?? tx.data.created_at)}
          </p>
        </>
      )}
      <div className="mt-auto flex w-full flex-col gap-3 pt-10">
        {tx.data && (
          <Link to={`/history/${tx.data.id}`}>
            <Button variant="secondary" full>
              {t('complete.viewDetail')}
            </Button>
          </Link>
        )}
        <Link to={state.next ?? '/'}>
          <Button full>{t('complete.home')}</Button>
        </Link>
      </div>
    </div>
  );
}
