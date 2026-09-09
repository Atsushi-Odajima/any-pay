/** 合計を n 人で均等按分し、端数は先頭から 1 円ずつ配る（合計は必ず total に一致） */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0 || !Number.isInteger(total) || total < 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function sumAmounts(amounts: Array<number | null>): number {
  return amounts.reduce<number>((acc, a) => acc + (a ?? 0), 0);
}
