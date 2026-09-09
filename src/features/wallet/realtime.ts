import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

type Unsubscribe = () => void;

/** 自分の charge_requests 1 行の UPDATE を購読（処理状況画面の即時更新。RLS により他人の行は届かない） */
export function subscribeChargeRequest(
  id: string,
  onUpdate: (row: Tables<'charge_requests'>) => void,
): Unsubscribe {
  try {
    const channel = supabase
      .channel(`charge-request:${id}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'charge_requests', filter: `id=eq.${id}` },
        (payload) => onUpdate(payload.new as Tables<'charge_requests'>),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel).catch(() => undefined);
    };
  } catch {
    // Realtime が使えなくてもポーリングで代替する
    return () => undefined;
  }
}
