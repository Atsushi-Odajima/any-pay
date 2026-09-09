import { assertEquals } from 'jsr:@std/assert@1';
import { mapSandboxEvent } from './sandbox_events.ts';

const data = {
  id: 'sbx_1',
  status: 'paid',
  amount: 1000,
  reference: 'req-1',
  method: 'bank_debit',
  channel: 'bank',
};

Deno.test('paid / declined / cancelled / expired / unknown', () => {
  assertEquals(
    mapSandboxEvent({ id: 'e', type: 'payment.paid', created: 1, data })?.kind,
    'completed',
  );
  assertEquals(
    mapSandboxEvent({ id: 'e', type: 'payment.declined', created: 1, data })?.code,
    'PROVIDER_DECLINED',
  );
  assertEquals(
    mapSandboxEvent({ id: 'e', type: 'payment.cancelled', created: 1, data })?.kind,
    'cancelled',
  );
  assertEquals(
    mapSandboxEvent({ id: 'e', type: 'payment.expired', created: 1, data })?.kind,
    'expired',
  );
  assertEquals(mapSandboxEvent({ id: 'e', type: 'payment.refunded', created: 1, data }), null);
  assertEquals(
    mapSandboxEvent({ id: 'e', type: 'payment.paid', created: 1, data })?.requestId,
    'req-1',
  );
});
