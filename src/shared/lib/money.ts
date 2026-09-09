// 金額は常に「円・整数」。表示用の整形のみを行い、加減算は行わない（計算はSQL関数の責務）

const yenFormatter = new Intl.NumberFormat('ja-JP');

/** 1234 -> "¥1,234" / -1234 -> "-¥1,234" */
export function formatYen(amount: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const body = `¥${yenFormatter.format(abs)}`;
  if (amount < 0) return `-${body}`;
  if (opts.sign && amount > 0) return `+${body}`;
  return body;
}

/** "1,234" / "１２３４" / "¥1234" -> 1234。数値化できない場合は null */
export function parseYen(input: string): number | null {
  const normalized = input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, '');
  if (normalized === '') return null;
  const n = Number(normalized);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export function formatPoints(points: number): string {
  return `${yenFormatter.format(points)} pt`;
}

export const LIMITS = {
  chargeMin: 1,
  chargeMax: 100_000,
  balanceMax: 1_000_000,
  transferMax: 50_000,
  paymentsPerMinute: 20,
} as const;
