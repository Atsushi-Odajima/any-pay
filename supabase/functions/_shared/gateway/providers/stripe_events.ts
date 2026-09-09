// Stripe のイベントを正規化する（純粋関数。SDK に依存しないのでテストしやすい）
import type { ProviderEvent } from '../types.ts';

export interface StripeSessionLike {
  id: string;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
}
export interface StripeEventLike {
  id: string;
  type: string;
  data: { object: unknown };
}

export function mapStripeEvent(event: StripeEventLike): ProviderEvent | null {
  const session = event.data.object as StripeSessionLike;
  const base = {
    requestId: session.metadata?.charge_request_id ?? null,
    providerRef: session.id,
    payload: {
      event_id: event.id,
      type: event.type,
      payment_status: session.payment_status ?? null,
    },
  };
  switch (event.type) {
    case 'checkout.session.completed':
      // コンビニ払いなど非同期の支払い方法は payment_status = 'unpaid' で完了イベントが来る
      return session.payment_status === 'paid'
        ? { ...base, kind: 'completed' }
        : { ...base, kind: 'processing' };
    case 'checkout.session.async_payment_succeeded':
      return { ...base, kind: 'completed' };
    case 'checkout.session.async_payment_failed':
      return { ...base, kind: 'failed', code: 'PROVIDER_DECLINED' };
    case 'checkout.session.expired':
      return { ...base, kind: 'expired', code: 'EXPIRED' };
    default:
      return null;
  }
}
