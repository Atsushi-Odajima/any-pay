import type { ChargeChannel, ChargeMethod, ChargeMethodSpec } from './api';

/** 画面に並べるチャージ方法。API 由来（provider × method）と、フォールバックの即時反映デモ（legacy）を同じ形で扱う */
export interface ChargeMenuItem {
  key: string;
  channel: ChargeChannel;
  provider: string;
  method: string;
  flow: 'redirect' | 'instructions' | 'instant';
  legacy: ChargeMethod | null;
}

const CHANNEL_ORDER: Record<ChargeChannel, number> = { bank: 0, card: 1, emoney: 2 };

/** API の一覧をメニュー項目に変換する（銀行 → カード → 電子決済の順） */
export function menuFromSpecs(specs: ChargeMethodSpec[]): ChargeMenuItem[] {
  return [...specs]
    .sort((a, b) => CHANNEL_ORDER[a.channel] - CHANNEL_ORDER[b.channel])
    .map((s) => ({
      key: `${s.provider}:${s.method}`,
      channel: s.channel,
      provider: s.provider,
      method: s.method,
      flow: s.flow,
      legacy: null,
    }));
}

/** チャージ API に接続できないときのフォールバック（RPC charge_wallet による即時反映） */
export const LEGACY_MENU: ChargeMenuItem[] = [
  {
    key: 'demo:bank',
    channel: 'bank',
    provider: 'demo',
    method: 'bank',
    flow: 'instant',
    legacy: 'bank',
  },
  {
    key: 'demo:card',
    channel: 'card',
    provider: 'demo',
    method: 'card',
    flow: 'instant',
    legacy: 'card',
  },
  {
    key: 'demo:convenience',
    channel: 'emoney',
    provider: 'demo',
    method: 'convenience',
    flow: 'instant',
    legacy: 'convenience',
  },
];

export type ChargeStatus =
  'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

/** 処理状況画面のステップ表示：0 = 受付, 1 = プロバイダで処理中, 2 = 完了 */
export function chargeStep(status: string): { index: number; failed: boolean } {
  switch (status as ChargeStatus) {
    case 'pending':
      return { index: 1, failed: false };
    case 'processing':
      return { index: 1, failed: false };
    case 'completed':
      return { index: 2, failed: false };
    default:
      return { index: 1, failed: true };
  }
}
