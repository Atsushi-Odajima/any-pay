import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, PageLoading } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { useInvalidateMoney, useStripeReturn } from '../hooks';

/** Stripe Checkout から戻る着地点。webhook が取引を作るまで待って完了画面へ */
export function StripeReturnPage() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id');
  const tx = useStripeReturn(sessionId);
  const invalidate = useInvalidateMoney();

  useEffect(() => {
    if (tx.data) {
      invalidate();
      navigate(`/complete/${tx.data.id}`, { replace: true });
    }
  }, [tx.data, navigate, invalidate]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <PageLoading label={t('pages.stripeWaiting')} />
      <p className="text-xs text-mist">{t('pages.stripeHint')}</p>
      <Link to="/">
        <Button variant="ghost">{t('common.home')}</Button>
      </Link>
    </div>
  );
}
