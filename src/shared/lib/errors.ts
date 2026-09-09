import { getLocale, translate } from '@/shared/i18n';

export class RpcError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
  }
}

/** Supabase Auth（GoTrue）の代表的なメッセージ → 辞書キー */
const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/Invalid login credentials/i, 'errors.invalidCredentials'],
  [/Database error finding user/i, 'errors.dbErrorFindingUser'],
  [/Email not confirmed/i, 'errors.emailNotConfirmed'],
  [/Token has expired|otp_expired/i, 'errors.otpExpired'],
  [/Invalid token|otp/i, 'errors.otpInvalid'],
  [/rate limit|too many requests/i, 'errors.rateLimited'],
  [/Signups not allowed/i, 'errors.signupDisabled'],
];

/** raise exception 'INSUFFICIENT_FUNDS' の message からコードを取り出す */
export function extractCode(message: string): string | null {
  const m = /^([A-Z][A-Z0-9_]+)$/.exec(message.trim());
  return m?.[1] ?? null;
}

/** Supabase / PostgREST / Auth のエラーを現在の言語の文言に変換する */
export function toUserMessage(error: unknown): string {
  const locale = getLocale();
  const t = (key: string) => translate(locale, key);
  if (error instanceof RpcError) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: unknown }).message);
    const code = extractCode(msg);
    if (code) {
      const key = `errors.${code}`;
      const known = t(key);
      return known === key ? msg : known;
    }
    // 辞書キーがそのまま message に入っている場合（validation.* など）
    if (/^[a-z]+\.[a-zA-Z.]+$/.test(msg)) {
      const known = t(msg);
      if (known !== msg) return known;
    }
    const auth = AUTH_MESSAGES.find(([re]) => re.test(msg));
    if (auth) return t(auth[1]);
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return t('errors.network');
    return msg;
  }
  return t('errors.unexpected');
}

export function isRpcCode(error: unknown, code: string): boolean {
  if (error instanceof RpcError) return error.code === code;
  if (error && typeof error === 'object' && 'message' in error) {
    return extractCode(String((error as { message: unknown }).message)) === code;
  }
  return false;
}
