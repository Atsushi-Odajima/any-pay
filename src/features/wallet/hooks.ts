import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import { chargeWallet, fetchMyWallets, fetchPointBalance, withdraw } from './api';

export const walletKeys = {
  wallets: (userId: string | undefined) => ['wallets', userId] as const,
  points: (userId: string | undefined) => ['points', userId] as const,
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
