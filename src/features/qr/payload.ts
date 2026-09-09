import { z } from 'zod';

/**
 * QR ペイロード仕様（CLAUDE.md §5）
 *   ap1:u:<token>        ユーザー提示（支払い）
 *   ap1:r:<request_id>   店舗提示・動的（金額固定）
 *   ap1:s:<merchant_id>  店舗提示・静的（印刷用）
 *   ap1:p:<handle>       個人の受取QR
 * 印刷QRなどはカメラアプリから開けるよう `https://<host>/scan?d=<payload>` 形式も受け付ける
 */
export const QR_VERSION = 'ap1';

export type QrPayload =
  | { kind: 'user_token'; token: string }
  | { kind: 'payment_request'; requestId: string }
  | { kind: 'static_merchant'; merchantId: string }
  | { kind: 'receive'; handle: string };

export class QrPayloadError extends Error {
  constructor(message = '対応していないQRコードです') {
    super(message);
    this.name = 'QrPayloadError';
  }
}

const KIND_PREFIX: Record<QrPayload['kind'], 'u' | 'r' | 's' | 'p'> = {
  user_token: 'u',
  payment_request: 'r',
  static_merchant: 's',
  receive: 'p',
};

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);
const uuidSchema = z.uuid();
const handleSchema = z.string().regex(/^[a-z0-9_]{3,20}$/);
const rawSchema = z.string().regex(/^ap1:[ursp]:[^\s:]+$/);

export function buildPayload(p: QrPayload): string {
  const value =
    p.kind === 'user_token'
      ? p.token
      : p.kind === 'payment_request'
        ? p.requestId
        : p.kind === 'static_merchant'
          ? p.merchantId
          : p.handle;
  return `${QR_VERSION}:${KIND_PREFIX[p.kind]}:${value}`;
}

/** 印刷QR用：カメラアプリで読むとアプリの /scan に飛ぶ URL */
export function buildScanUrl(origin: string, p: QrPayload): string {
  return `${origin}/scan?d=${encodeURIComponent(buildPayload(p))}`;
}

export function parsePayload(input: string): QrPayload {
  let text = input.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const d = new URL(text).searchParams.get('d');
      if (!d) throw new QrPayloadError();
      text = d;
    } catch {
      throw new QrPayloadError();
    }
  }
  if (!rawSchema.safeParse(text).success) throw new QrPayloadError();
  const [, kind, value] = text.split(':') as [string, string, string];
  switch (kind) {
    case 'u': {
      const r = tokenSchema.safeParse(value);
      if (!r.success) throw new QrPayloadError('QRコードのトークンが不正です');
      return { kind: 'user_token', token: r.data };
    }
    case 'r': {
      const r = uuidSchema.safeParse(value);
      if (!r.success) throw new QrPayloadError('決済リクエストIDが不正です');
      return { kind: 'payment_request', requestId: r.data };
    }
    case 's': {
      const r = uuidSchema.safeParse(value);
      if (!r.success) throw new QrPayloadError('店舗IDが不正です');
      return { kind: 'static_merchant', merchantId: r.data };
    }
    case 'p': {
      const r = handleSchema.safeParse(value);
      if (!r.success) throw new QrPayloadError('受取IDが不正です');
      return { kind: 'receive', handle: r.data };
    }
    default:
      throw new QrPayloadError();
  }
}
