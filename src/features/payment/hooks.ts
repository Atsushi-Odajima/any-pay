import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateMoney } from '@/features/wallet/hooks';
import { fetchMerchant, getPaymentRequest, payRequest, payStatic } from './api';

export function usePaymentRequestView(requestId: string | undefined) {
  return useQuery({
    queryKey: ['payment-request-view', requestId],
    queryFn: () => getPaymentRequest(requestId as string),
    enabled: !!requestId,
    refetchInterval: 5_000,
  });
}

export function useMerchant(merchantId: string | undefined) {
  return useQuery({
    queryKey: ['merchant', 'public', merchantId],
    queryFn: () => fetchMerchant(merchantId as string),
    enabled: !!merchantId,
  });
}

export function usePayRequest() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: payRequest, onSuccess: invalidate });
}

export function usePayStatic() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: payStatic, onSuccess: invalidate });
}
