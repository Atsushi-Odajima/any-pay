import { z } from 'zod';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

export type Merchant = Tables<'merchants'>;
export type Transaction = Tables<'transactions'>;

const paymentRequestView = z.object({
  id: z.string(),
  merchant_id: z.string(),
  merchant_name: z.string(),
  merchant_category: z.string().nullable(),
  amount: z.number(),
  memo: z.string().nullable(),
  status: z.enum(['open', 'paid', 'expired', 'cancelled']),
  expires_at: z.string(),
  paid_transaction_id: z.string().nullable(),
});
export type PaymentRequestView = z.infer<typeof paymentRequestView>;

export async function getPaymentRequest(requestId: string): Promise<PaymentRequestView> {
  const { data, error } = await supabase.rpc('get_payment_request', { p_request_id: requestId });
  if (error) throw error;
  return paymentRequestView.parse(data);
}

export async function fetchMerchant(merchantId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function payRequest(input: {
  requestId: string;
  idempotencyKey: string;
  userCouponId?: string | null;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('pay_request', {
    p_request_id: input.requestId,
    p_idempotency_key: input.idempotencyKey,
    p_user_coupon_id: input.userCouponId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function payStatic(input: {
  merchantId: string;
  amount: number;
  idempotencyKey: string;
  userCouponId?: string | null;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('pay_static', {
    p_merchant_id: input.merchantId,
    p_amount: input.amount,
    p_idempotency_key: input.idempotencyKey,
    p_user_coupon_id: input.userCouponId ?? null,
  });
  if (error) throw error;
  return data;
}
