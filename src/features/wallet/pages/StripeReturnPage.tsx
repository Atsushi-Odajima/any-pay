import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, PageLoading } from '@/shared/ui';
import { useInvalidateMoney, useStripeReturn } from '../hooks';

/** Stripe Checkout から戻る着地点。webhook が取引を作るまで待って完了画面へ */
export function StripeReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id');
  const tx = useStripeReturn(sessionId);
  const invalidate = useInvalidateMoney();

  useEffect(() => {
    if (tx.data) {
      invalidate();
      navigate(`/complete/${tx.data.id}`, { replace: true, state: { kind: 'charge' } });
    }
  }, [tx.data, navigate, invalidate]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <PageLoading label="Stripe の決済結果を反映しています…" />
      <p className="text-xs text-mist">
        webhook の到着を待っています。しばらく反映されない場合は履歴を確認してください。
      </p>
      <Link to="/">
        <Button variant="ghost">ホームへ戻る</Button>
      </Link>
    </div>
  );
}
