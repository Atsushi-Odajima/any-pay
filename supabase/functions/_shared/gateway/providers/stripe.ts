// Stripe（テストモード）プロバイダ：クレジットカード / コンビニ払い / PayPay を Checkout で扱う
//   secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   webhook: <SUPABASE_URL>/functions/v1/charge-webhook/stripe
//            events: checkout.session.completed / async_payment_succeeded / async_payment_failed / expired
import Stripe from 'npm:stripe@17';
import { HttpError } from '../../http.ts';
import type { ChargeProvider, MethodSpec } from '../types.ts';
import { mapStripeEvent } from './stripe_events.ts';

const METHODS: Array<MethodSpec & { types: string[] }> = [
  { provider: 'stripe', method: 'card', channel: 'card', flow: 'redirect', types: ['card'] },
  {
    provider: 'stripe',
    method: 'konbini',
    channel: 'emoney',
    flow: 'redirect',
    types: ['konbini'],
  },
  { provider: 'stripe', method: 'paypay', channel: 'emoney', flow: 'redirect', types: ['paypay'] },
];

function client(): Stripe {
  // apiVersion は SDK 既定（固定したい場合は Stripe ダッシュボードの API バージョンに合わせる）
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
}

export const stripeProvider: ChargeProvider = {
  id: 'stripe',
  methods: () =>
    METHODS.map(({ provider, method, channel, flow }) => ({ provider, method, channel, flow })),

  async createPayment(input) {
    const spec = METHODS.find((m) => m.method === input.method && m.channel === input.channel);
    if (!spec) throw new HttpError(400, 'INVALID_METHOD');
    const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60; // Checkout の最小有効期間は 30 分
    const session = await client().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: spec.types as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      client_reference_id: input.userId,
      metadata: { charge_request_id: input.requestId, user_id: input.userId, method: input.method },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'jpy', // 0 小数通貨：unit_amount は円そのもの
            unit_amount: input.amount,
            product_data: { name: 'Any Pay チャージ（デモ）' },
          },
        },
      ],
      success_url: `${input.returnUrl}?provider=stripe&result=success`,
      cancel_url: `${input.returnUrl}?provider=stripe&result=cancelled`,
      expires_at: expiresAt,
      locale: input.locale === 'en' ? 'en' : 'ja',
      ...(spec.method === 'konbini'
        ? { payment_method_options: { konbini: { expires_after_days: 1 } } }
        : {}),
    });
    return {
      providerRef: session.id,
      redirectUrl: session.url ?? undefined,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  },

  async parseWebhook(req, rawBody) {
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;
    try {
      event = await client().webhooks.constructEventAsync(
        rawBody,
        req.headers.get('stripe-signature') ?? '',
        secret,
      );
    } catch {
      throw new HttpError(400, 'INVALID_SIGNATURE');
    }
    const mapped = mapStripeEvent(event);
    return mapped ? [mapped] : [];
  },
};
