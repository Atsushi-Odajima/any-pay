import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import { useSession } from '@/features/auth/hooks';
import { useInvalidateMoney } from '@/features/wallet/hooks';
import type { Merchant } from './api';
import {
  cancelPaymentRequest,
  createPaymentRequest,
  fetchMyMerchant,
  fetchPaymentRequest,
  payWithToken,
  registerMerchant,
} from './api';

export const merchantKeys = {
  mine: (userId: string | undefined) => ['merchant', 'mine', userId] as const,
  request: (id: string | undefined) => ['merchant', 'request', id] as const,
};

export function useMyMerchant() {
  const { userId } = useSession();
  return useQuery({
    queryKey: merchantKeys.mine(userId),
    queryFn: () => fetchMyMerchant(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useRegisterMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerMerchant,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['merchant'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useCreatePaymentRequest() {
  return useMutation({ mutationFn: createPaymentRequest });
}

export function useCancelPaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelPaymentRequest,
    onSuccess: (r) => qc.setQueryData(merchantKeys.request(r.id), r),
  });
}

/** 動的QR表示中のリクエスト状態を 2 秒ごとにポーリング（paid になるまで） */
export function usePaymentRequestStatus(id: string | undefined) {
  return useQuery({
    queryKey: merchantKeys.request(id),
    queryFn: () => fetchPaymentRequest(id as string),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === 'open' ? 2_000 : false),
  });
}

export function usePayWithToken() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: payWithToken, onSuccess: invalidate });
}

/** MerchantLayout の Outlet context（店舗情報） */
export function useMerchantContext(): { merchant: Merchant } {
  return useOutletContext<{ merchant: Merchant }>();
}
