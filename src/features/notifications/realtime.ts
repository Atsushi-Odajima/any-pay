import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

/** 本人の notifications INSERT を購読（RLS により他人の行は届かない） */
export function subscribeNotifications(
  userId: string,
  onInsert: (row: Tables<'notifications'>) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Tables<'notifications'>),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** 自店の transactions INSERT を購読（店舗ホームの即時反映用） */
export function subscribeMerchantTransactions(
  merchantId: string,
  onInsert: (row: Tables<'transactions'>) => void,
): () => void {
  const channel = supabase
    .channel(`merchant-tx:${merchantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `merchant_id=eq.${merchantId}`,
      },
      (payload) => onInsert(payload.new as Tables<'transactions'>),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
