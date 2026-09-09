import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

export type Coupon = Tables<'coupons'> & { merchant: { name: string } | null };
export type UserCoupon = Tables<'user_coupons'> & { coupon: Coupon };
export type PointEntry = Tables<'point_entries'>;

/** 現在有効なクーポン（全店共通 + 各店舗） */
export async function fetchAvailableCoupons(): Promise<Coupon[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('coupons')
    .select('*, merchant:merchants(name)')
    .lte('valid_from', now)
    .gte('valid_until', now)
    .order('valid_until');
  if (error) throw error;
  return data;
}

export async function fetchMyCoupons(userId: string): Promise<UserCoupon[]> {
  const { data, error } = await supabase
    .from('user_coupons')
    .select('*, coupon:coupons(*, merchant:merchants(name))')
    .eq('user_id', userId);
  if (error) throw error;
  return data as UserCoupon[];
}

export async function claimCoupon(couponId: string): Promise<Tables<'user_coupons'>> {
  const { data, error } = await supabase.rpc('claim_coupon', { p_coupon_id: couponId });
  if (error) throw error;
  return data;
}

export async function fetchPointEntries(userId: string): Promise<PointEntry[]> {
  const { data, error } = await supabase
    .from('point_entries')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

/** 加盟店オーナーが自店のクーポンを作成（RLS: merchant owner のみ） */
export async function createMerchantCoupon(input: {
  merchantId: string;
  title: string;
  discountType: 'fixed' | 'percent';
  value: number;
  minAmount: number;
  validUntil: string;
  maxUses: number | null;
}): Promise<Tables<'coupons'>> {
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      merchant_id: input.merchantId,
      title: input.title,
      discount_type: input.discountType,
      value: input.value,
      min_amount: input.minAmount,
      valid_until: input.validUntil,
      max_uses: input.maxUses,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMerchantCoupons(merchantId: string): Promise<Tables<'coupons'>[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('valid_until', { ascending: false });
  if (error) throw error;
  return data;
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw error;
}
