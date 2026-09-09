// POST /charge-webhook/<provider>：プロバイダの確定通知を受け取り、charge_requests を遷移させる
//   - 署名検証はプロバイダ実装（parseWebhook）が行う。失敗は 400
//   - 業務上の拒否（CHARGE_NOT_PENDING など）は 200 で受理してログに残す（再送しても解決しないため）
//   - 一時的な障害（DB 接続など）は 500 を返し、プロバイダに再送させる
//   デプロイ: supabase functions deploy charge-webhook --no-verify-jwt（プロバイダは JWT を付けない）
import { errorResponse, json, routeSegments } from '../_shared/http.ts';
import { adminClient, isBusinessError, rpcErrorCode } from '../_shared/supabase.ts';
import { getProvider } from '../_shared/gateway/registry.ts';
import type { ProviderEvent } from '../_shared/gateway/types.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const [providerId] = routeSegments(req, 'charge-webhook');
  const provider = getProvider(providerId);
  if (!provider) return json({ error: 'INVALID_PROVIDER' }, 404);

  const rawBody = await req.text();
  let events: ProviderEvent[];
  try {
    events = await provider.parseWebhook(req, rawBody);
  } catch (e) {
    return errorResponse(e);
  }

  const admin = adminClient();
  const results: Array<Record<string, unknown>> = [];
  for (const ev of events) {
    if (!ev.requestId) {
      results.push({ providerRef: ev.providerRef, kind: ev.kind, result: 'ignored:no_request_id' });
      continue;
    }
    const call =
      ev.kind === 'completed'
        ? admin.rpc('complete_charge_request', {
            p_request_id: ev.requestId,
            p_provider_ref: ev.providerRef,
            p_payload: ev.payload,
          })
        : ev.kind === 'processing'
          ? admin.rpc('attach_charge_provider', {
              p_request_id: ev.requestId,
              p_provider_ref: ev.providerRef,
              p_status: 'processing',
            })
          : admin.rpc('fail_charge_request', {
              p_request_id: ev.requestId,
              p_code: ev.code ?? ev.kind.toUpperCase(),
              p_payload: ev.payload,
            });
    const { data, error } = await call;
    if (error) {
      console.error('charge-webhook', provider.id, ev.kind, ev.requestId, error.message);
      if (!isBusinessError(error)) return json({ error: 'TEMPORARY_FAILURE' }, 500);
      results.push({
        requestId: ev.requestId,
        kind: ev.kind,
        result: `ignored:${rpcErrorCode(error)}`,
      });
      continue;
    }
    results.push({ requestId: ev.requestId, kind: ev.kind, result: 'ok', status: data?.status });
  }
  return json({ received: true, provider: provider.id, results });
});
