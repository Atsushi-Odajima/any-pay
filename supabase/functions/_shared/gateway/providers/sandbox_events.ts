// サンドボックス（模擬プロバイダ）のイベントを正規化する（純粋関数）
import type { ProviderEvent } from '../types.ts';

export interface SandboxEvent {
  id: string;
  type: 'payment.paid' | 'payment.declined' | 'payment.cancelled' | 'payment.expired' | string;
  created: number;
  data: {
    id: string;
    status: string;
    amount: number;
    reference: string | null;
    method: string;
    channel: string;
  };
}

export function mapSandboxEvent(event: SandboxEvent): ProviderEvent | null {
  const base = {
    requestId: event.data.reference ?? null,
    providerRef: event.data.id,
    payload: { event_id: event.id, type: event.type, status: event.data.status },
  };
  switch (event.type) {
    case 'payment.paid':
      return { ...base, kind: 'completed' };
    case 'payment.declined':
      return { ...base, kind: 'failed', code: 'PROVIDER_DECLINED' };
    case 'payment.cancelled':
      return { ...base, kind: 'cancelled', code: 'CANCELLED' };
    case 'payment.expired':
      return { ...base, kind: 'expired', code: 'EXPIRED' };
    default:
      return null;
  }
}
