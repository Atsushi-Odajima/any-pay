// webhook 署名（Stripe と同じ考え方）：`t=<unix秒>,v1=<HMAC-SHA256(secret, "<t>.<body>")>`
//   - タイムスタンプで再送攻撃を防ぐ（許容誤差 5 分）
//   - 比較は定数時間で行う
const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signPayload(
  secret: string,
  timestamp: number,
  body: string,
): Promise<string> {
  return hmacHex(secret, `${timestamp}.${body}`);
}

export function formatSignature(timestamp: number, hex: string): string {
  return `t=${timestamp},v1=${hex}`;
}

export function parseSignature(header: string | null): { t: number; v1: string[] } | null {
  if (!header) return null;
  let t = NaN;
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.trim().split('=');
    if (k === 't') t = Number(v);
    else if (k === 'v1' && v) v1.push(v);
  }
  if (!Number.isFinite(t) || v1.length === 0) return null;
  return { t, v1 };
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySignature(
  secret: string,
  header: string | null,
  body: string,
  options: { toleranceSec?: number; nowSec?: number } = {},
): Promise<boolean> {
  const parsed = parseSignature(header);
  if (!parsed || !secret) return false;
  const now = options.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > (options.toleranceSec ?? 300)) return false;
  const expected = await signPayload(secret, parsed.t, body);
  return parsed.v1.some((v) => timingSafeEqual(v, expected));
}
