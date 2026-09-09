import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { secondsUntil } from '@/shared/lib/date';
import { createQrToken } from './api';

/**
 * ユーザー提示トークン。期限（60秒）の直前に自動再発行し、残り秒数を返す。
 * 使用済み・期限切れは refetch() で即時再発行する。
 */
export function useQrToken(enabled: boolean) {
  const query = useQuery({
    queryKey: ['qr-token'],
    queryFn: createQrToken,
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => {
      const expiresAt = q.state.data?.expires_at;
      if (!expiresAt) return false;
      return Math.max(1000, secondsUntil(expiresAt) * 1000 - 1500);
    },
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  const secondsLeft = query.data ? secondsUntil(query.data.expires_at, now) : 0;
  return { ...query, secondsLeft };
}
