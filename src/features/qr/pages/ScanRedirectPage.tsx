import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PageLoading, toast } from '@/shared/ui';
import { parsePayload } from '../payload';
import { routeForPayload } from '../routing';

/** カメラアプリで印刷QR（URL形式）を読んだときの着地点。/scan?d=ap1:... を解析して遷移 */
export function ScanRedirectPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const d = params.get('d');
    try {
      if (!d) throw new Error();
      const to = routeForPayload(parsePayload(d));
      if (!to) throw new Error();
      navigate(to, { replace: true });
    } catch {
      toast.error('対応していないQRコードです');
      navigate('/pay', { replace: true });
    }
  }, [params, navigate]);
  return <PageLoading />;
}
