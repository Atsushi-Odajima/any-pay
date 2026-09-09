import { z } from 'zod';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

export type Merchant = Tables<'merchants'>;
export type PaymentRequest = Tables<'payment_requests'>;
export type Transaction = Tables<'transactions'>;

export async function fetchMyMerchant(userId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function registerMerchant(input: {
  name: string;
  category?: string;
  address?: string;
}): Promise<Merchant> {
  const { data, error } = await supabase.rpc('register_merchant', {
    p_name: input.name,
    p_category: input.category ?? undefined,
    p_address: input.address ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function createPaymentRequest(input: {
  merchantId: string;
  amount: number;
  memo?: string;
}): Promise<PaymentRequest> {
  const { data, error } = await supabase.rpc('create_payment_request', {
    p_amount: input.amount,
    p_memo: input.memo ?? undefined,
    p_merchant_id: input.merchantId,
  });
  if (error) throw error;
  return data;
}

export async function fetchPaymentRequest(id: string): Promise<PaymentRequest | null> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cancelPaymentRequest(id: string): Promise<PaymentRequest> {
  const { data, error } = await supabase.rpc('cancel_payment_request', { p_request_id: id });
  if (error) throw error;
  return data;
}

export async function payWithToken(input: {
  token: string;
  amount: number;
  merchantId: string;
  idempotencyKey: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('pay_with_token', {
    p_token: input.token,
    p_amount: input.amount,
    p_merchant_id: input.merchantId,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data;
}

const todaySummarySchema = z.object({
  sales: z.number(),
  count: z.number(),
  refunds: z.number(),
  refund_count: z.number(),
  net: z.number(),
  since: z.string(),
});
export type TodaySummary = z.infer<typeof todaySummarySchema>;

export async function fetchTodaySummary(merchantId: string): Promise<TodaySummary> {
  const { data, error } = await supabase.rpc('merchant_today_summary', {
    p_merchant_id: merchantId,
  });
  if (error) throw error;
  return todaySummarySchema.parse(data);
}

export type MerchantTransaction = Transaction;

export async function fetchMerchantTransactions(
  merchantId: string,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<MerchantTransaction[]> {
  let q = supabase
    .from('transactions')
    .select('*')
    .eq('merchant_id', merchantId)
    .in('type', ['payment', 'refund'])
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.from) q = q.gte('created_at', opts.from);
  if (opts.to) q = q.lt('created_at', opts.to);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function refundTransaction(transactionId: string): Promise<Transaction> {
  const { data, error } = await supabase.rpc('refund_transaction', {
    p_transaction_id: transactionId,
  });
  if (error) throw error;
  return data;
}
