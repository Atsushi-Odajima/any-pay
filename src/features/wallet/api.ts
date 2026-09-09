import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import type { Json, Tables } from '@/types/database';

export type Wallet = Tables<'wallets'>;
export type Transaction = Tables<'transactions'>;
export type ChargeRequest = Tables<'charge_requests'>;
/** 即時反映のデモ方式（チャージ API に接続できない環境のフォールバック） */
export type ChargeMethod = 'bank' | 'card' | 'convenience';
export type ChargeChannel = 'bank' | 'card' | 'emoney';
export type ChargeFlow = 'redirect' | 'instructions';

/** チャージ API が返す「プロバイダ × 方式」 */
export interface ChargeMethodSpec {
  provider: string;
  method: string;
  channel: ChargeChannel;
  flow: ChargeFlow;
}

export interface CreateChargeResult {
  request: ChargeRequest;
  redirectUrl: string | null;
  instructions: Json | null;
  flow: ChargeFlow;
}

export async function fetchMyWallets(userId: string): Promise<Wallet[]> {
  const { data, error } = await supabase.from('wallets').select('*').eq('owner_id', userId);
  if (error) throw error;
  return data;
}

export async function fetchPointBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('point_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}

export async function chargeWallet(input: {
  amount: number;
  method: ChargeMethod;
  idempotencyKey: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('charge_wallet', {
    p_amount: input.amount,
    p_method: input.method,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function withdraw(input: {
  amount: number;
  idempotencyKey: string;
  walletId?: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('withdraw', {
    p_amount: input.amount,
    p_idempotency_key: input.idempotencyKey,
    p_wallet_id: input.walletId ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Edge Function のエラー本文（{ error: 'CODE' }）をコードとして投げ直す */
async function functionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
    if (body?.error) return new Error(body.error);
  }
  return error instanceof Error ? error : new Error('GATEWAY_UNAVAILABLE');
}

/** 利用できるチャージ方法（secrets の有無で決まる）。関数が未デプロイなら失敗する */
export async function fetchChargeMethods(): Promise<ChargeMethodSpec[]> {
  const { data, error } = await supabase.functions.invoke<{ methods: ChargeMethodSpec[] }>(
    'charge-methods',
    { method: 'GET' },
  );
  if (error) throw await functionError(error);
  return data?.methods ?? [];
}

/** 入金リクエストを作り、プロバイダの承認画面 URL または払込番号を受け取る */
export async function createChargeRequest(input: {
  amount: number;
  channel: ChargeChannel;
  provider: string;
  method: string;
  idempotencyKey: string;
  origin: string;
  locale: string;
}): Promise<CreateChargeResult> {
  const { data, error } = await supabase.functions.invoke<CreateChargeResult>('charge-create', {
    body: input,
  });
  if (error) throw await functionError(error);
  if (!data?.request) throw new Error('PROVIDER_ERROR');
  return data;
}

export async function fetchChargeRequest(id: string): Promise<ChargeRequest | null> {
  const { data, error } = await supabase
    .from('charge_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cancelChargeRequest(id: string): Promise<ChargeRequest> {
  const { data, error } = await supabase.rpc('cancel_charge_request', { p_request_id: id });
  if (error) throw error;
  return data;
}
