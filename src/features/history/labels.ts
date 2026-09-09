import type { TxType } from './api';
import { chargeMethodLabel, parseMeta, type TxMeta } from './meta';
import type { Tables } from '@/types/database';
import { tr } from '@/shared/i18n';

export const TX_TYPES: TxType[] = [
  'charge',
  'payment',
  'transfer',
  'withdrawal',
  'refund',
  'split',
];

export function txTypeLabel(type: TxType): string {
  return tr(`tx.type.${type}`);
}

const PAYMENT_METHODS = new Set(['user_presented', 'merchant_dynamic', 'merchant_static']);

export function paymentMethodLabel(method: string | undefined): string | undefined {
  if (!method) return undefined;
  return PAYMENT_METHODS.has(method) ? tr(`tx.paymentMethod.${method}`) : method;
}

/** 取引の表示タイトル（自分から見た相手・店名） */
export function describeTransaction(
  tx: Tables<'transactions'> & { merchant?: { name: string } | null },
  direction: 'in' | 'out',
): { title: string; subtitle?: string } {
  const meta: TxMeta = parseMeta(tx.metadata);
  const merchant = tx.merchant?.name ?? meta.merchant_name;
  switch (tx.type) {
    case 'charge':
      return { title: tr('tx.type.charge'), subtitle: chargeMethodLabel(meta.method) };
    case 'withdrawal':
      return {
        title: tr('tx.type.withdrawal'),
        subtitle: meta.wallet_kind === 'merchant' ? tr('tx.fromMerchantWallet') : undefined,
      };
    case 'payment':
      return direction === 'out'
        ? { title: merchant ?? tr('tx.payment'), subtitle: meta.coupon_title }
        : {
            title: tr('tx.paymentFrom', { name: meta.payer_name ?? tr('tx.payer') }),
            subtitle: meta.payer_handle ? `@${meta.payer_handle}` : undefined,
          };
    case 'refund':
      return direction === 'in'
        ? { title: tr('tx.refundFrom', { name: merchant ?? tr('tx.store') }) }
        : { title: tr('tx.refundTo', { name: meta.payer_name ?? tr('tx.payer') }) };
    case 'transfer':
      return direction === 'out'
        ? {
            title: tr('tx.transferTo', { name: meta.to_name ?? tr('tx.send') }),
            subtitle: meta.to_handle ? `@${meta.to_handle}` : undefined,
          }
        : {
            title: tr('tx.transferFrom', { name: meta.from_name ?? tr('tx.receive') }),
            subtitle: meta.from_handle ? `@${meta.from_handle}` : undefined,
          };
    case 'split':
      return direction === 'out'
        ? { title: tr('tx.splitPay', { name: meta.to_name ?? '' }), subtitle: tx.memo ?? undefined }
        : {
            title: tr('tx.splitReceive', { name: meta.from_name ?? '' }),
            subtitle: tx.memo ?? undefined,
          };
  }
}
