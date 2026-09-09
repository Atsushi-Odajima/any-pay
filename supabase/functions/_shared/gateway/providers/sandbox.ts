// サンドボックス（模擬プロバイダ）：銀行口座振替 / カード / コンビニ / 電子マネーウォレット
//   実在のプロバイダ API と同じ形（REST + 承認画面へのリダイレクト + 署名付き webhook）で
//   sandbox-gateway（別の Edge Function）と HTTP で通信する。第三者のアカウントなしで
//   非同期の入金フローを端から端まで動かせる。
//   secrets: SANDBOX_API_KEY（API 認証）, SANDBOX_WEBHOOK_SECRET（webhook 署名）
import { functionsBaseUrl, HttpError } from '../../http.ts';
import { verifySignature } from '../../signature.ts';
import type { ChargeProvider, MethodSpec } from '../types.ts';
import { mapSandboxEvent, type SandboxEvent } from './sandbox_events.ts';

const METHODS: MethodSpec[] = [
  { provider: 'sandbox', method: 'bank_debit', channel: 'bank', flow: 'redirect' },
  { provider: 'sandbox', method: 'card', channel: 'card', flow: 'redirect' },
  { provider: 'sandbox', method: 'konbini', channel: 'emoney', flow: 'instructions' },
  { provider: 'sandbox', method: 'wallet', channel: 'emoney', flow: 'redirect' },
];

interface SandboxPayment {
  id: string;
  status: string;
  checkout_url: string;
  instructions: Record<string, unknown> | null;
  expires_at: string;
}

export function sandboxBaseUrl(): string {
  return Deno.env.get('SANDBOX_BASE_URL') ?? `${functionsBaseUrl()}/sandbox-gateway`;
}

export const sandboxProvider: ChargeProvider = {
  id: 'sandbox',
  methods: () => METHODS,

  async createPayment(input) {
    const spec = METHODS.find((m) => m.method === input.method && m.channel === input.channel);
    if (!spec) throw new HttpError(400, 'INVALID_METHOD');
    const res = await fetch(`${sandboxBaseUrl()}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SANDBOX_API_KEY') ?? ''}`,
        'Idempotency-Key': input.requestId,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: 'jpy',
        channel: input.channel,
        method: input.method,
        reference: input.requestId,
        return_url: `${input.returnUrl}?provider=sandbox`,
        webhook_url: input.webhookUrl,
        locale: input.locale,
      }),
    });
    if (!res.ok) {
      console.error('sandbox createPayment failed', res.status, await res.text().catch(() => ''));
      throw new HttpError(502, 'PROVIDER_ERROR');
    }
    const payment = (await res.json()) as SandboxPayment;
    return {
      providerRef: payment.id,
      redirectUrl: payment.checkout_url,
      instructions: payment.instructions ?? undefined,
      status: spec.flow === 'instructions' ? 'processing' : 'pending',
      expiresAt: payment.expires_at,
    };
  },

  async parseWebhook(req, rawBody) {
    const ok = await verifySignature(
      Deno.env.get('SANDBOX_WEBHOOK_SECRET') ?? '',
      req.headers.get('x-sandbox-signature'),
      rawBody,
    );
    if (!ok) throw new HttpError(400, 'INVALID_SIGNATURE');
    const mapped = mapSandboxEvent(JSON.parse(rawBody) as SandboxEvent);
    return mapped ? [mapped] : [];
  },
};
