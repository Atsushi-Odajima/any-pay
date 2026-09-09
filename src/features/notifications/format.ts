import { tr } from '@/shared/i18n';
import { formatYen } from '@/shared/lib/money';
import type { Notification } from './api';

type Data = {
  amount?: number;
  merchant_name?: string;
  payer_name?: string;
  payer_handle?: string;
  from_name?: string;
  from_handle?: string;
  points?: number;
  remaining?: number;
  creator_name?: string;
  memo?: string;
};

/** 通知の表示文言を現在の言語で組み立てる（data に十分な情報が無い古い通知はサーバーの title を使う） */
export function describeNotification(n: Pick<Notification, 'type' | 'title' | 'body' | 'data'>): {
  title: string;
  body: string | null;
} {
  const d = (n.data ?? {}) as Data;
  const amount = typeof d.amount === 'number' ? formatYen(d.amount) : null;
  switch (n.type) {
    case 'payment_sent':
      if (amount && d.merchant_name) {
        return {
          title: tr('notifications.paymentSent', { merchant: d.merchant_name, amount }),
          body: d.points ? tr('notifications.pointsEarned', { points: d.points }) : null,
        };
      }
      break;
    case 'payment_received':
      if (amount) {
        return {
          title: tr('notifications.paymentReceived', { amount }),
          body: d.payer_name
            ? `${d.payer_name}${d.payer_handle ? ` (@${d.payer_handle})` : ''}`
            : n.body,
        };
      }
      break;
    case 'transfer_received':
      if (amount && (d.from_name || d.from_handle)) {
        return {
          title: tr('notifications.transferReceived', {
            name: d.from_name ?? `@${d.from_handle}`,
            amount,
          }),
          body: d.memo ?? n.body,
        };
      }
      break;
    case 'split_requested':
      if (amount && d.creator_name) {
        return {
          title: tr('notifications.splitRequested', { name: d.creator_name, amount }),
          body: d.memo ?? n.body,
        };
      }
      break;
    case 'split_paid':
      if (amount && d.payer_name) {
        return {
          title: tr('notifications.splitPaid', { name: d.payer_name, amount }),
          body:
            d.remaining === 0
              ? tr('notifications.splitAllPaid')
              : typeof d.remaining === 'number'
                ? tr('notifications.splitRemaining', { n: d.remaining })
                : n.body,
        };
      }
      break;
    case 'refund_received':
      if (amount && d.merchant_name) {
        return {
          title: tr('notifications.refundReceived', { merchant: d.merchant_name, amount }),
          body: d.points ? tr('notifications.pointsRevoked', { points: d.points }) : null,
        };
      }
      break;
  }
  return { title: n.title, body: n.body };
}
