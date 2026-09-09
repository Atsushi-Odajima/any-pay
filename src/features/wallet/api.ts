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

/** Stripe Checkout（テストモード）のセッションを作成し、決済ページ URL を返す */
export async function createStripeCheckout(input: {
  amount: number;
  origin: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-checkout',
    {
      body: input,
    },
  );
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? 'CHECKOUT_FAILED');
  return data.url;
}

/** Stripe の webhook が作った取引（冪等キー = session id）。未反映なら null */
export async function fetchTransactionByIdempotencyKey(key: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error) throw error;
  return data;
}
