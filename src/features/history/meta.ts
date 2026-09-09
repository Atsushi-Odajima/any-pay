import { z } from 'zod';
import type { Json } from '@/types/database';

/** transactions.metadata の表示用スナップショット（RPC が書く） */
const metaSchema = z
  .object({
    method: z.string().optional(),
    wallet_kind: z.string().optional(),
    merchant_name: z.string().optional(),
    payer_handle: z.string().optional(),
    payer_name: z.string().optional(),
    from_handle: z.string().optional(),
    from_name: z.string().optional(),
    to_handle: z.string().optional(),
    to_name: z.string().optional(),
    original_amount: z.number().optional(),
    discount: z.number().optional(),
    subsidy: z.number().optional(),
    coupon_title: z.string().optional(),
    points: z.number().optional(),
    split_request_id: z.string().optional(),
    refund_of: z.string().optional(),
    refund_transaction_id: z.string().optional(),
    payment_method: z.string().optional(),
  })
  .loose();

export type TxMeta = z.infer<typeof metaSchema>;

export function parseMeta(json: Json): TxMeta {
  const r = metaSchema.safeParse(json);
  return r.success ? r.data : {};
}

export const CHARGE_METHOD_LABEL: Record<string, string> = {
  bank: '銀行口座',
  card: 'クレジットカード',
  convenience: 'コンビニ',
  stripe: 'カード（Stripe）',
};
