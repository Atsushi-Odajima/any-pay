import { describe, expect, it } from 'vitest';
import { monthKey, monthRange, secondsUntil, shiftMonth } from '@/shared/lib/date';

describe('monthKey (JST)', () => {
  it('UTC の月末深夜は JST では翌月になる', () => {
    expect(monthKey('2026-08-31T20:00:00Z')).toBe('2026-09');
    expect(monthKey('2026-08-31T10:00:00Z')).toBe('2026-08');
  });
});

describe('monthRange', () => {
  it('JST 月初 0:00 を UTC で返す', () => {
    const r = monthRange('2026-09');
    expect(r.from).toBe('2026-08-31T15:00:00.000Z');
    expect(r.to).toBe('2026-09-30T15:00:00.000Z');
  });
});

describe('shiftMonth', () => {
  it('年をまたぐ', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('secondsUntil', () => {
  it('負にならない', () => {
    const now = Date.parse('2026-09-09T00:00:00Z');
    expect(secondsUntil('2026-09-09T00:00:30Z', now)).toBe(30);
    expect(secondsUntil('2026-09-08T23:59:00Z', now)).toBe(0);
  });
});
