import { describe, expect, it } from 'vitest';
import { buildPayload, buildScanUrl, parsePayload, QrPayloadError } from '@/features/qr/payload';

const uuid = '0b1f1d5e-5d3a-4d9e-9a7f-2c1e4f6a8b90';
const token = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd';

describe('buildPayload / parsePayload', () => {
  it('4種類の形式を往復できる', () => {
    const cases = [
      { kind: 'user_token', token },
      { kind: 'payment_request', requestId: uuid },
      { kind: 'static_merchant', merchantId: uuid },
      { kind: 'receive', handle: 'taro_1' },
    ] as const;
    for (const c of cases) {
      const text = buildPayload(c);
      expect(text.startsWith('ap1:')).toBe(true);
      expect(parsePayload(text)).toEqual(c);
    }
  });

  it('URL 形式（印刷QR）も解析できる', () => {
    const url = buildScanUrl('https://anypay.example', {
      kind: 'static_merchant',
      merchantId: uuid,
    });
    expect(url).toBe(`https://anypay.example/scan?d=ap1%3As%3A${uuid}`);
    expect(parsePayload(url)).toEqual({ kind: 'static_merchant', merchantId: uuid });
  });

  it('前後の空白は無視する', () => {
    expect(parsePayload(`  ap1:p:alice \n`)).toEqual({ kind: 'receive', handle: 'alice' });
  });

  it('未知の形式・バージョンはエラー', () => {
    expect(() => parsePayload('hello')).toThrow(QrPayloadError);
    expect(() => parsePayload('ap2:u:' + token)).toThrow(QrPayloadError);
    expect(() => parsePayload('ap1:x:abc')).toThrow(QrPayloadError);
    expect(() => parsePayload('https://evil.example/?x=1')).toThrow(QrPayloadError);
  });

  it('値の形式が不正ならエラー', () => {
    expect(() => parsePayload('ap1:r:not-a-uuid')).toThrow('決済リクエストIDが不正です');
    expect(() => parsePayload('ap1:s:123')).toThrow('店舗IDが不正です');
    expect(() => parsePayload('ap1:p:Bad Handle')).toThrow(QrPayloadError);
    expect(() => parsePayload('ap1:u:short')).toThrow('QRコードのトークンが不正です');
  });
});
