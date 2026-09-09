import { assertEquals } from 'jsr:@std/assert@1';
import { mapStripeEvent } from './stripe_events.ts';

const session = (payment_status: string) => ({
  id: 'cs_test_1',
  payment_status,
  metadata: { charge_request_id: 'req-1' },
});

Deno.test('completed（paid）→ completed', () => {
  const e = mapStripeEvent({
    id: 'evt',
    type: 'checkout.session.completed',
    data: { object: session('paid') },
  });
  assertEquals(e?.kind, 'completed');
  assertEquals(e?.requestId, 'req-1');
  assertEquals(e?.providerRef, 'cs_test_1');
});

Deno.test('completed（unpaid = コンビニ等）→ processing、async 成功 → completed', () => {
  assertEquals(
    mapStripeEvent({
      id: 'evt',
      type: 'checkout.session.completed',
      data: { object: session('unpaid') },
    })?.kind,
    'processing',
  );
  assertEquals(
    mapStripeEvent({
      id: 'evt',
      type: 'checkout.session.async_payment_succeeded',
      data: { object: session('paid') },
    })?.kind,
    'completed',
  );
});

Deno.test('失敗・期限切れ・無関係なイベント', () => {
  assertEquals(
    mapStripeEvent({
      id: 'evt',
      type: 'checkout.session.async_payment_failed',
      data: { object: session('unpaid') },
    })?.code,
    'PROVIDER_DECLINED',
  );
  assertEquals(
    mapStripeEvent({
      id: 'evt',
      type: 'checkout.session.expired',
      data: { object: session('unpaid') },
    })?.kind,
    'expired',
  );
  assertEquals(
    mapStripeEvent({ id: 'evt', type: 'payment_intent.created', data: { object: {} } }),
    null,
  );
});
