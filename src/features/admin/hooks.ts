import { useQuery } from '@tanstack/react-query';
import { fetchLedgerStats, reconcileWallets } from './api';

export function useReconcile() {
  return useQuery({ queryKey: ['admin', 'reconcile'], queryFn: reconcileWallets, staleTime: 0 });
}

export function useLedgerStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchLedgerStats, staleTime: 0 });
}
