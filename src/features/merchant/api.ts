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
    p_category: input.category ?? null,
    p_address: input.address ?? null,
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
    p_memo: input.memo ?? null,
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
