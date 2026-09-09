import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import {
  claimCoupon,
  createMerchantCoupon,
  deleteCoupon,
  fetchAvailableCoupons,
  fetchMerchantCoupons,
  fetchMyCoupons,
  fetchPointEntries,
} from './api';

export function useAvailableCoupons() {
  return useQuery({ queryKey: ['coupons', 'available'], queryFn: fetchAvailableCoupons });
}

export function useMyCoupons() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['coupons', 'mine', userId],
    queryFn: () => fetchMyCoupons(userId as string),
    enabled: !!userId,
  });
}

/** 未使用の保有クーポン（決済確認画面用） */
export function useUsableCoupons(merchantId: string | undefined) {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['coupons', 'mine', userId],
    queryFn: () => fetchMyCoupons(userId as string),
    enabled: !!userId,
    select: (list) => {
      const now = Date.now();
      return list.filter(
        (uc) =>
          uc.used_at === null &&
          Date.parse(uc.coupon.valid_until) > now &&
          (uc.coupon.merchant_id === null || uc.coupon.merchant_id === merchantId),
      );
    },
  });
}

export function useClaimCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: claimCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function usePointEntries() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['points', 'entries', userId],
    queryFn: () => fetchPointEntries(userId as string),
    enabled: !!userId,
  });
}

export function useMerchantCoupons(merchantId: string | undefined) {
  return useQuery({
    queryKey: ['coupons', 'merchant', merchantId],
    queryFn: () => fetchMerchantCoupons(merchantId as string),
    enabled: !!merchantId,
  });
}

export function useCreateMerchantCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMerchantCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}
