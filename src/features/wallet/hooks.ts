import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import {
  cancelChargeRequest,
  chargeWallet,
  createChargeRequest,
  fetchChargeMethods,
  fetchChargeRequest,
  fetchMyWallets,
  fetchPointBalance,
  withdraw,
  type ChargeRequest,
} from './api';
import { subscribeChargeRequest } from './realtime';

export const walletKeys = {
  wallets: (userId: string | undefined) => ['wallets', userId] as const,
  points: (userId: string | undefined) => ['points', userId] as const,
  chargeMethods: ['charge-methods'] as const,
  chargeRequest: (id: string | undefined) => ['charge-request', id] as const,
};

/** 残高系の再取得（取引後に呼ぶ） */
export function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['wallets'] });
    void qc.invalidateQueries({ queryKey: ['points'] });
    void qc.invalidateQueries({ queryKey: ['ledger'] });
    void qc.invalidateQueries({ queryKey: ['transactions'] });
    void qc.invalidateQueries({ queryKey: ['merchant'] });
  };
}

export function useMyWallets() {
  const { userId } = useSession();
  return useQuery({
    queryKey: walletKeys.wallets(userId),
    queryFn: () => fetchMyWallets(userId as string),
    enabled: !!userId,
  });
}

/** 自分の user wallet（1人1つ） */
export function useMyWallet() {
  const q = useMyWallets();
  return { ...q, data: q.data?.find((w) => w.kind === 'user') ?? null };
}

export function usePointBalance() {
  const { userId } = useSession();
  return useQuery({
    queryKey: walletKeys.points(userId),
    queryFn: () => fetchPointBalance(userId as string),
    enabled: !!userId,
  });
}

export function useCharge() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: chargeWallet, onSuccess: invalidate });
}

export function useWithdraw() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: withdraw, onSuccess: invalidate });
}

/** チャージ API の利用可能な方式。未デプロイ / 未設定なら error になり、画面は即時反映のデモにフォールバックする */
export function useChargeMethods() {
  return useQuery({
    queryKey: walletKeys.chargeMethods,
    queryFn: fetchChargeMethods,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCreateChargeRequest() {
  return useMutation({ mutationFn: createChargeRequest });
}

const isOpen = (r: ChargeRequest | null | undefined) =>
  r?.status === 'pending' || r?.status === 'processing';

/** 入金リクエストの現在状態。Realtime の UPDATE で即時更新し、届かない場合は 3 秒ごとにポーリング */
export function useChargeRequest(id: string | undefined) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: walletKeys.chargeRequest(id),
    queryFn: () => fetchChargeRequest(id as string),
    enabled: !!id,
    refetchInterval: (query) => (isOpen(query.state.data) ? 3_000 : false),
  });
  useEffect(() => {
    if (!id) return;
    return subscribeChargeRequest(id, (row) => qc.setQueryData(walletKeys.chargeRequest(id), row));
  }, [id, qc]);
  return q;
}

export function useCancelChargeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelChargeRequest,
    onSuccess: (row) => qc.setQueryData(walletKeys.chargeRequest(row.id), row),
  });
}
