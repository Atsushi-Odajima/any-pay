import { describe, expect, it } from 'vitest';
import { splitEvenly, sumAmounts } from '@/features/transfer/split';

describe('splitEvenly', () => {
  it('割り切れる場合は均等', () => {
    expect(splitEvenly(6000, 3)).toEqual([2000, 2000, 2000]);
  });
  it('端数は先頭から 1 円ずつ配り、合計は一致する', () => {
    expect(splitEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(7, 4)).toEqual([2, 2, 2, 1]);
    for (const [t, n] of [
      [12345, 7],
      [1, 5],
      [99999, 20],
    ] as const) {
      const r = splitEvenly(t, n);
      expect(r).toHaveLength(n);
      expect(sumAmounts(r)).toBe(t);
    }
  });
  it('不正な入力は空', () => {
    expect(splitEvenly(100, 0)).toEqual([]);
    expect(splitEvenly(-1, 2)).toEqual([]);
  });
});
