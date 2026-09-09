import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

/**
 * supabase-js の channel() は同じ topic のチャンネルが既にあるとそれを返す。
 * 購読済みチャンネルに .on() を追加すると
 * "cannot add postgres_changes callbacks ... after subscribe()" で例外になるため、
 * 購読ごとに一意な topic を使う（複数画面が同時に購読しても衝突しない）。
 */
function uniqueTopic(prefix: string): string {
  return `${prefix}:${Math.random().toString(36).slice(2, 10)}`;
}

type Unsubscribe = () => void;

function subscribe<T>(
  topic: string,
  table: 'notifications' | 'transactions',
  filter: string,
  onInsert: (row: T) => void,
): Unsubscribe {
  try {
    const channel = supabase
      .channel(uniqueTopic(topic))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, (payload) =>
        onInsert(payload.new as T),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel).catch(() => undefined);
    };
  } catch {
    // Realtime が使えなくても画面は落とさない（ポーリング・手動更新で代替）
    return () => undefined;
  }
}

/** 本人の notifications INSERT を購読（RLS により他人の行は届かない） */
export function subscribeNotifications(
  userId: string,
  onInsert: (row: Tables<'notifications'>) => void,
): Unsubscribe {
  return subscribe(`notifications:${userId}`, 'notifications', `user_id=eq.${userId}`, onInsert);
}

/** 自店の transactions INSERT を購読（店舗ホームの即時反映用） */
export function subscribeMerchantTransactions(
  merchantId: string,
  onInsert: (row: Tables<'transactions'>) => void,
): Unsubscribe {
  return subscribe(
    `merchant-tx:${merchantId}`,
    'transactions',
    `merchant_id=eq.${merchantId}`,
    onInsert,
  );
}
