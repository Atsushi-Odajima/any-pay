import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import { useInvalidateMoney } from '@/features/wallet/hooks';
import {
  createSplitRequest,
  fetchMySplits,
  fetchProfileByHandle,
  fetchSplit,
  paySplit,
  searchProfiles,
  transfer,
} from './api';

export function useProfileSearch(query: string) {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['profile-search', query],
    queryFn: () => searchProfiles(query, userId),
    enabled: query.trim().length >= 1,
    staleTime: 30_000,
  });
}

export function useProfileByHandle(handle: string | null) {
  return useQuery({
    queryKey: ['profile-by-handle', handle],
    queryFn: () => fetchProfileByHandle(handle as string),
    enabled: !!handle,
  });
}

export function useTransfer() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: transfer, onSuccess: invalidate });
}

export function useMySplits() {
  const { userId } = useSession();
  return useQuery({ queryKey: ['splits', userId], queryFn: fetchMySplits, enabled: !!userId });
}

export function useSplit(id: string | undefined) {
  return useQuery({
    queryKey: ['split', id],
    queryFn: () => fetchSplit(id as string),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

export function useCreateSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSplitRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['splits'] }),
  });
}

export function usePaySplit() {
  const qc = useQueryClient();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: paySplit,
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['splits'] });
      void qc.invalidateQueries({ queryKey: ['split'] });
    },
  });
}
