import { useQuery } from '@tanstack/react-query';
import { fetchLedger, fetchTransaction, type LedgerFilter } from './api';

export const historyKeys = {
  ledger: (walletId: string | undefined, filter: LedgerFilter) =>
    ['ledger', walletId, filter] as const,
  transaction: (id: string | undefined) => ['transactions', id] as const,
};

export function useLedger(walletId: string | undefined, filter: LedgerFilter = {}) {
  return useQuery({
    queryKey: historyKeys.ledger(walletId, filter),
    queryFn: () => fetchLedger(walletId as string, filter),
    enabled: !!walletId,
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: historyKeys.transaction(id),
    queryFn: () => fetchTransaction(id as string),
    enabled: !!id,
  });
}
