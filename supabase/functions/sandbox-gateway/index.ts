// サンドボックス・ゲートウェイ：外部の入金プロバイダ（銀行口座振替 / カード / コンビニ / 電子マネー）を模擬する
//   「外部システム」として振る舞うため、アプリの表（charge_requests）には触れず、
//   sandbox_payments（service_role のみ）だけを使い、結果は署名付き webhook でアプリに通知する。
//
//   API（Authorization: Bearer <SANDBOX_API_KEY>）
//     POST /v1/payments                 支払いを作成 → { id, status, checkout_url, instructions, expires_at }
//     GET  /v1/payments/:id             状態を取得
//     POST /v1/payments/:id/simulate    { outcome: 'paid' | 'declined' } を適用して webhook を送る（自動テスト用）
//   ホスト型ページ（認証なし。id は推測不能）
//     GET  /checkout/:id                承認画面
//     POST /checkout/:id                approve / decline → webhook → return_url へリダイレクト
//     POST /checkout/:id?resend=1       webhook を再送（冪等性のデモ）
//   webhook（署名：X-Sandbox-Signature = t=<unix>,v1=<HMAC-SHA256>）
//     { id, type: 'payment.paid' | 'payment.declined' | ..., created, data: {...} }
//   デプロイ: supabase functions deploy sandbox-gateway --no-verify-jwt
import { errorResponse, html, HttpError, json, routeSegments } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { formatSignature, signPayload, timingSafeEqual } from '../_shared/signature.ts';
import { renderCheckout, renderResult } from './pages.ts';

const FN = 'sandbox-gateway';
const METHODS: Record<string, { channel: string; flow: 'redirect' | 'instructions' }> = {
  bank_debit: { channel: 'bank', flow: 'redirect' },
  card: { channel: 'card', flow: 'redirect' },
  konbini: { channel: 'emoney', flow: 'instructions' },
  wallet: { channel: 'emoney', flow: 'redirect' },
};

interface Payment {
  id: string;
  channel: string;
  method: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'declined' | 'cancelled' | 'expired';
  reference: string | null;
  return_url: string;
  webhook_url: string;
  instructions: Record<string, unknown> | null;
  webhook_log: Array<Record<string, unknown>>;
  expires_at: string;
  created_at: string;
  paid_at: string | null;
}

function baseUrl(req: Request): string {
  const u = new URL(req.url);
  const i = u.pathname.indexOf(`/${FN}`);
  return `${u.origin}${u.pathname.slice(0, i)}/${FN}`;
}

function requireApiKey(req: Request): void {
  const expected = Deno.env.get('SANDBOX_API_KEY') ?? '';
  const given = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!expected || !timingSafeEqual(given, expected)) throw new HttpError(401, 'UNAUTHORIZED');
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `sbx_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function paymentCode(): string {
  const n = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');
  return `${n()}-${n()}-${n()}`;
}

async function loadPayment(id: string): Promise<Payment> {
  const { data, error } = await adminClient()
    .from('sandbox_payments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
  if (!data) throw new HttpError(404, 'PAYMENT_NOT_FOUND');
  return data as Payment;
}

function publicView(p: Payment, req: Request) {
  return {
    id: p.id,
    object: 'payment',
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    channel: p.channel,
    method: p.method,
    reference: p.reference,
    checkout_url: `${baseUrl(req)}/checkout/${p.id}`,
    instructions: p.instructions,
    expires_at: p.expires_at,
    created_at: p.created_at,
    paid_at: p.paid_at,
    webhook_attempts: p.webhook_log.length,
  };
}

/** 署名付き webhook を送る（失敗時は最大 3 回）。結果を webhook_log に残す */
async function deliverWebhook(p: Payment, type: string): Promise<number | null> {
  const secret = Deno.env.get('SANDBOX_WEBHOOK_SECRET') ?? '';
  const event = {
    id: `evt_${newId().slice(4)}`,
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      id: p.id,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      channel: p.channel,
      method: p.method,
      reference: p.reference,
    },
  };
  const body = JSON.stringify(event);
  let lastStatus: number | null = null;
  const log = [...p.webhook_log];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t = Math.floor(Date.now() / 1000);
    const signature = formatSignature(t, await signPayload(secret, t, body));
    try {
      const res = await fetch(p.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Signature': signature,
          'X-Sandbox-Event-Id': event.id,
          'X-Sandbox-Delivery-Attempt': String(attempt),
        },
        body,
      });
      lastStatus = res.status;
      log.push({
        event_id: event.id,
        type,
        attempt,
        status: res.status,
        at: new Date().toISOString(),
      });
      if (res.ok) break;
    } catch (e) {
      lastStatus = null;
      log.push({
        event_id: event.id,
        type,
        attempt,
        error: String(e),
        at: new Date().toISOString(),
      });
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  await adminClient().from('sandbox_payments').update({ webhook_log: log }).eq('id', p.id);
  p.webhook_log = log;
  return lastStatus;
}

function eventTypeFor(status: Payment['status']): string {
  return status === 'paid'
    ? 'payment.paid'
    : status === 'declined'
      ? 'payment.declined'
      : status === 'cancelled'
        ? 'payment.cancelled'
        : 'payment.expired';
}

/** 承認 / 拒否を適用して webhook を送る。処理済みなら何もしない（冪等） */
async function settle(
  p: Payment,
  outcome: 'approve' | 'decline',
): Promise<{ payment: Payment; webhookStatus: number | null }> {
  if (p.status !== 'created') return { payment: p, webhookStatus: null };
  const expired = Date.parse(p.expires_at) < Date.now();
  const status: Payment['status'] = expired
    ? 'expired'
    : outcome === 'approve'
      ? 'paid'
      : p.method === 'konbini'
        ? 'cancelled'
        : 'declined';
  const { data, error } = await adminClient()
    .from('sandbox_payments')
    .update({
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', p.id)
    .eq('status', 'created') // 同時実行でも 1 回だけ遷移する
    .select('*')
    .maybeSingle();
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
  if (!data) return { payment: await loadPayment(p.id), webhookStatus: null };
  const updated = data as Payment;
  const webhookStatus = await deliverWebhook(updated, eventTypeFor(updated.status));
  return { payment: updated, webhookStatus };
}

function pageInput(p: Payment) {
  return {
    id: p.id,
    channel: p.channel,
    method: p.method,
    amount: p.amount,
    status: p.status,
    instructions: p.instructions,
    returnUrl: p.return_url,
    locale: 'ja',
  };
}

function withResult(returnUrl: string, result: string): string {
  const u = new URL(returnUrl);
  u.searchParams.set('result', result);
  return u.toString();
}

Deno.serve(async (req) => {
  try {
    const seg = routeSegments(req, FN);
    // --- API ---------------------------------------------------------------
    if (seg.length === 0 && req.method === 'GET') {
      return json({
        name: 'Any Pay Sandbox Gateway',
        version: '1',
        description: '銀行口座振替 / カード / コンビニ / 電子マネー を模擬する入金プロバイダ',
        methods: Object.entries(METHODS).map(([method, m]) => ({ method, ...m })),
        endpoints: [
          'POST /v1/payments',
          'GET /v1/payments/:id',
          'POST /v1/payments/:id/simulate',
          'GET /checkout/:id',
        ],
      });
    }
    if (seg[0] === 'v1' && seg[1] === 'payments') {
      requireApiKey(req);
      if (seg.length === 2 && req.method === 'POST') {
        const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const method = String(b.method ?? '');
        const spec = METHODS[method];
        const amount = b.amount;
        if (!spec) throw new HttpError(400, 'INVALID_METHOD');
        if (!Number.isInteger(amount) || (amount as number) < 1)
          throw new HttpError(400, 'INVALID_AMOUNT');
        if (typeof b.return_url !== 'string' || typeof b.webhook_url !== 'string')
          throw new HttpError(400, 'INVALID_URL');
        // Idempotency-Key（= reference）が同じなら既存を返す
        const idem = req.headers.get('Idempotency-Key');
        if (idem) {
          const { data } = await adminClient()
            .from('sandbox_payments')
            .select('*')
            .eq('reference', idem)
            .maybeSingle();
          if (data) return json(publicView(data as Payment, req));
        }
        const id = newId();
        const expiresAt = new Date(
          Date.now() + (spec.flow === 'instructions' ? 24 * 60 : 30) * 60_000,
        ).toISOString();
        const instructions =
          method === 'konbini'
            ? { payment_code: paymentCode(), store: 'Any Konbini', expires_at: expiresAt }
            : null;
        const row = {
          id,
          channel: spec.channel,
          method,
          amount,
          currency: String(b.currency ?? 'jpy'),
          status: 'created',
          reference: typeof b.reference === 'string' ? b.reference : (idem ?? null),
          return_url: b.return_url,
          webhook_url: b.webhook_url,
          instructions,
          expires_at: expiresAt,
        };
        const { data, error } = await adminClient()
          .from('sandbox_payments')
          .insert(row)
          .select('*')
          .single();
        if (error) throw new HttpError(500, 'INTERNAL_ERROR', error.message);
        return json(publicView(data as Payment, req), 201);
      }
      if (seg.length === 3 && req.method === 'GET') {
        return json(publicView(await loadPayment(seg[2]), req));
      }
      if (seg.length === 4 && seg[3] === 'simulate' && req.method === 'POST') {
        const b = (await req.json().catch(() => ({}))) as { outcome?: string };
        const outcome = b.outcome === 'paid' ? 'approve' : 'decline';
        const { payment, webhookStatus } = await settle(await loadPayment(seg[2]), outcome);
        return json({ ...publicView(payment, req), webhook_status: webhookStatus });
      }
      throw new HttpError(404, 'NOT_FOUND');
    }
    // --- ホスト型ページ ----------------------------------------------------
    if (seg[0] === 'checkout' && seg[1]) {
      const p = await loadPayment(seg[1]);
      if (req.method === 'GET') {
        if (p.status !== 'created') return html(renderResult(pageInput(p), lastWebhookStatus(p)));
        if (Date.parse(p.expires_at) < Date.now()) {
          const { payment, webhookStatus } = await settle(p, 'decline');
          return html(renderResult(pageInput(payment), webhookStatus));
        }
        return html(renderCheckout(pageInput(p)));
      }
      if (req.method === 'POST') {
        const form = await req.formData().catch(() => null);
        const outcome = String(form?.get('outcome') ?? '');
        if (outcome === 'resend' || new URL(req.url).searchParams.get('resend') === '1') {
          if (p.status === 'created') return html(renderCheckout(pageInput(p)));
          const status = await deliverWebhook(p, eventTypeFor(p.status));
          return html(renderResult(pageInput(p), status));
        }
        const { payment } = await settle(p, outcome === 'approve' ? 'approve' : 'decline');
        const result = payment.status === 'paid' ? 'paid' : payment.status;
        return Response.redirect(withResult(payment.return_url, result), 303);
      }
    }
    throw new HttpError(404, 'NOT_FOUND');
  } catch (e) {
    return errorResponse(e);
  }
});

function lastWebhookStatus(p: Payment): number | null {
  const last = p.webhook_log[p.webhook_log.length - 1];
  return typeof last?.status === 'number' ? (last.status as number) : null;
}
