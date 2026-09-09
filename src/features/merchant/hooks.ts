import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import { subscribeMerchantTransactions } from '@/features/notifications/realtime';
import { useSession } from '@/features/auth/hooks';
import { useInvalidateMoney } from '@/features/wallet/hooks';
import type { Merchant, Transaction } from './api';
import {
  cancelPaymentRequest,
  createPaymentRequest,
  fetchMerchantTransactions,
  fetchMyMerchant,
  fetchPaymentRequest,
  fetchTodaySummary,
  payWithToken,
  refundTransaction,
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

export function useTodaySummary(merchantId: string | undefined) {
  return useQuery({
    queryKey: ['merchant', 'today', merchantId],
    queryFn: () => fetchTodaySummary(merchantId as string),
    enabled: !!merchantId,
    refetchInterval: 30_000,
  });
}

export function useMerchantTransactions(
  merchantId: string | undefined,
  opts: { from?: string; to?: string; limit?: number } = {},
) {
  return useQuery({
    queryKey: ['merchant', 'transactions', merchantId, opts],
    queryFn: () => fetchMerchantTransactions(merchantId as string, opts),
    enabled: !!merchantId,
  });
}

export function useRefund() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: refundTransaction, onSuccess: invalidate });
}

/** 自店の決済 INSERT を Realtime で受け、売上・一覧を即時更新する */
export function useMerchantTransactionStream(
  merchantId: string | undefined,
  onInsert?: (tx: Transaction) => void,
) {
  const qc = useQueryClient();
  const ref = useRef(onInsert);
  useEffect(() => {
    ref.current = onInsert;
  }, [onInsert]);
  useEffect(() => {
    if (!merchantId) return;
    return subscribeMerchantTransactions(merchantId, (tx) => {
      void qc.invalidateQueries({ queryKey: ['merchant'] });
      void qc.invalidateQueries({ queryKey: ['wallets'] });
      ref.current?.(tx);
    });
  }, [merchantId, qc]);
}
