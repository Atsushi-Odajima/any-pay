import { assert, assertEquals } from 'jsr:@std/assert@1';
import { formatSignature, parseSignature, signPayload, verifySignature } from './signature.ts';

const secret = 'whsec_test_secret';
const body = JSON.stringify({ id: 'evt_1', type: 'payment.paid' });

Deno.test('署名の往復', async () => {
  const t = 1_800_000_000;
  const header = formatSignature(t, await signPayload(secret, t, body));
  assert(await verifySignature(secret, header, body, { nowSec: t + 10 }));
});

Deno.test('本文の改ざん・別の鍵は拒否', async () => {
  const t = 1_800_000_000;
  const header = formatSignature(t, await signPayload(secret, t, body));
  assertEquals(await verifySignature(secret, header, body + ' ', { nowSec: t }), false);
  assertEquals(await verifySignature('other', header, body, { nowSec: t }), false);
});

Deno.test('古いタイムスタンプは拒否（再送攻撃）', async () => {
  const t = 1_800_000_000;
  const header = formatSignature(t, await signPayload(secret, t, body));
  assertEquals(await verifySignature(secret, header, body, { nowSec: t + 301 }), false);
  assert(await verifySignature(secret, header, body, { nowSec: t + 299 }));
});

Deno.test('ヘッダの解析', () => {
  assertEquals(parseSignature('t=1,v1=ab,v1=cd'), { t: 1, v1: ['ab', 'cd'] });
  assertEquals(parseSignature('v1=ab'), null);
  assertEquals(parseSignature(null), null);
  assertEquals(parseSignature('t=x,v1=ab'), null);
});
