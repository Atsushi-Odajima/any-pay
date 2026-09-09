import { assert, assertStringIncludes } from 'jsr:@std/assert@1';
import { renderCheckout, renderResult, yen } from './pages.ts';

const base = {
  id: 'sbx_abc',
  amount: 12345,
  status: 'created',
  instructions: null,
  returnUrl: 'https://app.example/charge/pending/1?provider=sandbox',
  locale: 'ja',
};

Deno.test('金額表記', () => {
  assert(yen(12345) === '¥12,345');
});

Deno.test('承認画面：ブランド・金額・承認ボタン', () => {
  const html = renderCheckout({ ...base, channel: 'bank', method: 'bank_debit' });
  assertStringIncludes(html, 'Any Bank');
  assertStringIncludes(html, '¥12,345');
  assertStringIncludes(html, 'value="approve"');
  assertStringIncludes(html, 'value="decline"');
});

Deno.test('コンビニ：払込番号を表示、HTML エスケープ', () => {
  const html = renderCheckout({
    ...base,
    channel: 'emoney',
    method: 'konbini',
    instructions: { payment_code: '1234-5678-<b>' },
  });
  assertStringIncludes(html, '1234-5678-&lt;b&gt;');
});

Deno.test('結果画面：戻るリンクと再送ボタン', () => {
  const html = renderResult({ ...base, channel: 'card', method: 'card', status: 'paid' }, 200);
  assertStringIncludes(html, 'Back to Any Pay');
  assertStringIncludes(html, 'HTTP 200');
  assertStringIncludes(html, 'value="resend"');
});
