import { z } from 'zod';
import { supabase } from '@/shared/lib/supabase';
import type { FunctionReturns } from '@/types/db';

export type ReconcileRow = FunctionReturns<'reconcile_wallets'>[number];

const statsSchema = z.object({
  wallets: z.number(),
  transactions: z.number(),
  ledger_entries: z.number(),
  ledger_sum: z.number(),
  treasury_balance: z.number(),
  user_balance_total: z.number(),
});
export type LedgerStats = z.infer<typeof statsSchema>;

export async function reconcileWallets(): Promise<ReconcileRow[]> {
  const { data, error } = await supabase.rpc('reconcile_wallets');
  if (error) throw error;
  return data;
}

export async function fetchLedgerStats(): Promise<LedgerStats> {
  const { data, error } = await supabase.rpc('ledger_stats');
  if (error) throw error;
  return statsSchema.parse(data);
}
