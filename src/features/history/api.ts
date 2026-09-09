import { supabase } from '@/shared/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export type TxType = Enums<'tx_type'>;

export type LedgerLine = Tables<'ledger_entries'> & {
  transaction: Tables<'transactions'> & { merchant: { name: string } | null };
};

export interface LedgerFilter {
  from?: string;
  to?: string;
  type?: TxType;
  limit?: number;
}

/** 履歴 = 自分の wallet の台帳行（balance_after 付き）+ 取引情報 */
export async function fetchLedger(
  walletId: string,
  filter: LedgerFilter = {},
): Promise<LedgerLine[]> {
  let q = supabase
    .from('ledger_entries')
    .select('*, transaction:transactions!inner(*, merchant:merchants(name))')
    .eq('wallet_id', walletId)
    .order('id', { ascending: false })
    .limit(filter.limit ?? 200);
  if (filter.from) q = q.gte('created_at', filter.from);
  if (filter.to) q = q.lt('created_at', filter.to);
  if (filter.type) q = q.eq('transaction.type', filter.type);
  const { data, error } = await q;
  if (error) throw error;
  return data as LedgerLine[];
}

export async function fetchTransaction(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, merchant:merchants(name), ledger:ledger_entries(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
