import type { TxType } from './api';
import { CHARGE_METHOD_LABEL, parseMeta, type TxMeta } from './meta';
import type { Tables } from '@/types/database';

export const TX_TYPE_LABEL: Record<TxType, string> = {
  charge: 'チャージ',
  payment: '支払い',
  transfer: '送金',
  withdrawal: '出金',
  refund: '返金',
  split: '割り勘',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  user_presented: 'ユーザー提示（店舗スキャン）',
  merchant_dynamic: '店舗提示（動的QR）',
  merchant_static: '店舗提示（静的QR）',
};

/** 取引の表示タイトル（自分から見た相手・店名） */
export function describeTransaction(
  tx: Tables<'transactions'> & { merchant?: { name: string } | null },
  direction: 'in' | 'out',
): { title: string; subtitle?: string } {
  const meta: TxMeta = parseMeta(tx.metadata);
  switch (tx.type) {
    case 'charge':
      return { title: 'チャージ', subtitle: CHARGE_METHOD_LABEL[meta.method ?? ''] ?? meta.method };
    case 'withdrawal':
      return {
        title: '出金',
        subtitle: meta.wallet_kind === 'merchant' ? '店舗売上から' : undefined,
      };
    case 'payment':
      return direction === 'out'
        ? {
            title: tx.merchant?.name ?? meta.merchant_name ?? '支払い',
            subtitle: meta.coupon_title,
          }
        : {
            title: `${meta.payer_name ?? '購入者'} からの決済`,
            subtitle: meta.payer_handle ? `@${meta.payer_handle}` : undefined,
          };
    case 'refund':
      return direction === 'in'
        ? { title: `${tx.merchant?.name ?? meta.merchant_name ?? '店舗'} からの返金` }
        : { title: `${meta.payer_name ?? '購入者'} へ返金` };
    case 'transfer':
      return direction === 'out'
        ? {
            title: `${meta.to_name ?? '送金'} へ送金`,
            subtitle: meta.to_handle ? `@${meta.to_handle}` : undefined,
          }
        : {
            title: `${meta.from_name ?? '受取'} から受取`,
            subtitle: meta.from_handle ? `@${meta.from_handle}` : undefined,
          };
    case 'split':
      return direction === 'out'
        ? { title: `割り勘の支払い（${meta.to_name ?? ''}）`, subtitle: tx.memo ?? undefined }
        : { title: `割り勘の受取（${meta.from_name ?? ''}）`, subtitle: tx.memo ?? undefined };
  }
}
