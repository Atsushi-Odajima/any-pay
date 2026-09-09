import { describe, expect, it } from 'vitest';
import { formatPhoneForDisplay, normalizePhone } from '@/features/auth/phone';

describe('normalizePhone', () => {
  it('国内形式を E.164 に変換する', () => {
    expect(normalizePhone('090-1234-5678')).toBe('+819012345678');
    expect(normalizePhone('０９０１２３４５６７８')).toBe('+819012345678');
    expect(normalizePhone('03-1234-5678')).toBe('+81312345678');
  });
  it('+ 始まりはそのまま', () => {
    expect(normalizePhone('+819000000001')).toBe('+819000000001');
  });
  it('不正な入力は null', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('1234')).toBeNull();
    expect(normalizePhone('+1')).toBeNull();
  });
});

describe('formatPhoneForDisplay', () => {
  it('携帯番号をハイフン区切りにする', () => {
    expect(formatPhoneForDisplay('+819012345678')).toBe('090-1234-5678');
  });
});
