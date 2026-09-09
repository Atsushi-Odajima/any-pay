import { tr } from '@/shared/i18n';

/** クーポンの割引額プレビュー（サーバーの _apply_coupon と同じ規則。確定値はサーバーが返す） */
export function previewDiscount(
  coupon: { discount_type: string; value: number; min_amount: number },
  amount: number,
): number {
  if (amount <= 0 || amount < coupon.min_amount) return 0;
  const raw =
    coupon.discount_type === 'fixed' ? coupon.value : Math.floor((amount * coupon.value) / 100);
  return Math.min(Math.max(raw, 0), amount - 1);
}

export function describeDiscount(coupon: {
  discount_type: string;
  value: number;
  min_amount: number;
}): string {
  const base =
    coupon.discount_type === 'fixed'
      ? tr('coupons.fixedOff', { amount: coupon.value.toLocaleString('ja-JP') })
      : tr('coupons.percentOff', { percent: coupon.value });
  return coupon.min_amount > 0
    ? `${base}${tr('coupons.minAmount', { amount: coupon.min_amount.toLocaleString('ja-JP') })}`
    : base;
}
