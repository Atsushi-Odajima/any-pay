import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

export type Wallet = Tables<'wallets'>;
export type Transaction = Tables<'transactions'>;
export type ChargeMethod = 'bank' | 'card' | 'convenience';

export async function fetchMyWallets(userId: string): Promise<Wallet[]> {
  const { data, error } = await supabase.from('wallets').select('*').eq('owner_id', userId);
  if (error) throw error;
  return data;
}

export async function fetchPointBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('point_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}

export async function chargeWallet(input: {
  amount: number;
  method: ChargeMethod;
  idempotencyKey: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('charge_wallet', {
    p_amount: input.amount,
    p_method: input.method,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function withdraw(input: {
  amount: number;
  idempotencyKey: string;
  walletId?: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('withdraw', {
    p_amount: input.amount,
    p_idempotency_key: input.idempotencyKey,
    p_wallet_id: input.walletId ?? null,
  });
  if (error) throw error;
  return data;
}
