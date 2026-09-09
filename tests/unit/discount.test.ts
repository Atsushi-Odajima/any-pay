import { describe, expect, it } from 'vitest';
import { describeDiscount, previewDiscount } from '@/features/rewards/discount';

describe('previewDiscount', () => {
  it('固定額・割合（切り捨て）', () => {
    expect(previewDiscount({ discount_type: 'fixed', value: 300, min_amount: 0 }, 2000)).toBe(300);
    expect(previewDiscount({ discount_type: 'percent', value: 10, min_amount: 0 }, 2999)).toBe(299);
  });
  it('最低利用金額未満は 0', () => {
    expect(previewDiscount({ discount_type: 'fixed', value: 300, min_amount: 1000 }, 999)).toBe(0);
  });
  it('支払額は最低 1 円（割引は amount - 1 が上限）', () => {
    expect(previewDiscount({ discount_type: 'fixed', value: 500, min_amount: 0 }, 300)).toBe(299);
    expect(previewDiscount({ discount_type: 'percent', value: 100, min_amount: 0 }, 100)).toBe(99);
  });
});

describe('describeDiscount', () => {
  it('表示文言', () => {
    expect(describeDiscount({ discount_type: 'fixed', value: 300, min_amount: 1000 })).toBe(
      '300円引き（1,000円以上）',
    );
    expect(describeDiscount({ discount_type: 'percent', value: 10, min_amount: 0 })).toBe(
      '10% OFF',
    );
  });
});
