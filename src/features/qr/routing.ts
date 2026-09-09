import type { QrPayload } from './payload';

/** 読み取ったペイロードに応じて遷移先を決める（ユーザー側） */
export function routeForPayload(p: QrPayload): string | null {
  switch (p.kind) {
    case 'payment_request':
      return `/pay/confirm/request/${p.requestId}`;
    case 'static_merchant':
      return `/pay/confirm/static/${p.merchantId}`;
    case 'receive':
      return `/send?to=${encodeURIComponent(p.handle)}`;
    case 'user_token':
      return null;
  }
}
