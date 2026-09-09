import { describe, expect, it } from 'vitest';
import { formatYen, parseYen } from '@/shared/lib/money';

describe('formatYen', () => {
  it('3桁区切りで整形する', () => {
    expect(formatYen(0)).toBe('¥0');
    expect(formatYen(1234)).toBe('¥1,234');
    expect(formatYen(1_000_000)).toBe('¥1,000,000');
  });
  it('負数と符号付き表示', () => {
    expect(formatYen(-500)).toBe('-¥500');
    expect(formatYen(500, { sign: true })).toBe('+¥500');
    expect(formatYen(0, { sign: true })).toBe('¥0');
  });
});

describe('parseYen', () => {
  it('区切り文字・全角・通貨記号を除去して整数化する', () => {
    expect(parseYen('1,234')).toBe(1234);
    expect(parseYen('１２３４')).toBe(1234);
    expect(parseYen('¥500')).toBe(500);
  });
  it('数字がなければ null', () => {
    expect(parseYen('')).toBeNull();
    expect(parseYen('abc')).toBeNull();
  });
  it('小数は切り捨てず数字だけを拾う（整数円のみの前提）', () => {
    expect(parseYen('12.5')).toBe(125);
  });
});
