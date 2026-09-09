// Supabase クライアント：ユーザー JWT 付き（RLS が効く）と service_role（状態遷移・記帳用）
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new HttpError(500, 'MISCONFIGURED', `${name} is not set`);
  return v;
}

/** 呼び出し元ユーザーの JWT を引き継ぐクライアント（RPC は auth.uid() でそのユーザーとして動く） */
export function userClient(req: Request): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

/** service_role クライアント。charge_requests の状態遷移と記帳、sandbox_payments の読み書きにのみ使う */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

export async function requireUser(req: Request): Promise<{ id: string; client: SupabaseClient }> {
  const client = userClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'NOT_AUTHENTICATED');
  return { id: data.user.id, client };
}

/** PostgREST のエラーから RPC の raise exception コード（INSUFFICIENT_FUNDS など）を取り出す */
export function rpcErrorCode(error: { message?: string } | null | undefined): string {
  const m = /^([A-Z][A-Z0-9_]+)$/.exec((error?.message ?? '').trim());
  return m?.[1] ?? 'INTERNAL_ERROR';
}

/** 業務エラー（コード形式）か、一時的なエラー（再試行で解決しうる）かを分ける */
export function isBusinessError(error: { message?: string } | null | undefined): boolean {
  return rpcErrorCode(error) !== 'INTERNAL_ERROR';
}
