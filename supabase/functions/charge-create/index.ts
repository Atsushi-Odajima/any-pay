// POST /charge-create：入金リクエストを作り、プロバイダに支払いを作成する
//   body: { amount, channel, provider, method, idempotencyKey, origin, locale? }
//   1. create_charge_request（ユーザー JWT。上限・冪等性は DB 側で検査）
//   2. provider.createPayment（承認画面 URL / 払込番号）
//   3. attach_charge_provider（service_role）
//   → { request, redirectUrl, instructions, flow }
import {
  corsHeaders,
  errorResponse,
  functionsBaseUrl,
  HttpError,
  isHttpUrl,
  json,
} from '../_shared/http.ts';
import { adminClient, requireUser, rpcErrorCode } from '../_shared/supabase.ts';
import { getProvider } from '../_shared/gateway/registry.ts';
import type { Channel } from '../_shared/gateway/types.ts';

interface Body {
  amount?: unknown;
  channel?: unknown;
  provider?: unknown;
  method?: unknown;
  idempotencyKey?: unknown;
  origin?: unknown;
  locale?: unknown;
}

interface ChargeRequestRow {
  id: string;
  amount: number;
  channel: Channel;
  provider: string;
  method: string;
  status: string;
  provider_ref: string | null;
  redirect_url: string | null;
  instructions: Record<string, unknown> | null;
}

const CHANNELS: Channel[] = ['bank', 'card', 'emoney'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const { id: userId, client } = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as Body;

    const amount = body.amount;
    if (!Number.isInteger(amount) || (amount as number) < 1 || (amount as number) > 100_000) {
      throw new HttpError(400, 'INVALID_AMOUNT');
    }
    const channel = body.channel as Channel;
    if (!CHANNELS.includes(channel)) throw new HttpError(400, 'INVALID_CHANNEL');
    if (typeof body.method !== 'string' || typeof body.provider !== 'string') {
      throw new HttpError(400, 'INVALID_METHOD');
    }
    if (typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length < 8) {
      throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY');
    }
    const origin = isHttpUrl(body.origin) ? body.origin : (Deno.env.get('APP_ORIGIN') ?? '');
    if (!isHttpUrl(origin)) throw new HttpError(400, 'INVALID_ORIGIN');
    const locale = body.locale === 'en' ? 'en' : 'ja';

    const provider = getProvider(body.provider);
    if (!provider) throw new HttpError(404, 'INVALID_PROVIDER');
    const spec = provider.methods().find((m) => m.method === body.method && m.channel === channel);
    if (!spec) throw new HttpError(400, 'INVALID_METHOD');

    // 1. リクエスト作成（ユーザーとして。auth.uid() で本人に紐づく）
    const created = await client.rpc('create_charge_request', {
      p_amount: amount,
      p_channel: channel,
      p_provider: provider.id,
      p_method: spec.method,
      p_idempotency_key: body.idempotencyKey,
    });
    if (created.error) throw new HttpError(400, rpcErrorCode(created.error));
    const request = created.data as ChargeRequestRow;

    // 冪等リプレイ：すでにプロバイダに紐づいていればそのまま返す
    if (request.provider_ref) {
      return json({
        request,
        redirectUrl: request.redirect_url,
        instructions: request.instructions,
        flow: spec.flow,
      });
    }
    if (request.status !== 'pending') throw new HttpError(409, 'CHARGE_NOT_PENDING');

    // 2. プロバイダに支払いを作る
    const admin = adminClient();
    let result;
    try {
      result = await provider.createPayment({
        requestId: request.id,
        userId,
        amount: request.amount,
        channel,
        method: spec.method,
        returnUrl: `${origin.replace(/\/$/, '')}/charge/pending/${request.id}`,
        webhookUrl: `${functionsBaseUrl()}/charge-webhook/${provider.id}`,
        locale,
      });
    } catch (e) {
      await admin.rpc('fail_charge_request', {
        p_request_id: request.id,
        p_code: 'PROVIDER_ERROR',
        p_payload: { message: e instanceof Error ? e.message : String(e) },
      });
      throw e instanceof HttpError ? e : new HttpError(502, 'PROVIDER_ERROR');
    }

    // 3. 紐づけ
    const attached = await admin.rpc('attach_charge_provider', {
      p_request_id: request.id,
      p_provider_ref: result.providerRef,
      p_redirect_url: result.redirectUrl ?? null,
      p_instructions: result.instructions ?? null,
      p_status: result.status ?? 'pending',
      p_expires_at: result.expiresAt ?? null,
    });
    if (attached.error) throw new HttpError(500, rpcErrorCode(attached.error));
    const row = attached.data as ChargeRequestRow;
    return json({
      request: row,
      redirectUrl: row.redirect_url,
      instructions: row.instructions,
      flow: spec.flow,
    });
  } catch (e) {
    return errorResponse(e);
  }
});
