/** 金銭系RPCに渡す冪等キー。画面（確認ステップ）ごとに1回生成し、リトライでは同じ値を再利用する */
export function newIdempotencyKey(prefix = 'ap'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
