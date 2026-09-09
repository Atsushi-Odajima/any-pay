/** RPC が raise する業務エラーコード → 日本語メッセージ */
const RPC_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'ログインが必要です',
  PROFILE_NOT_FOUND: 'プロフィールが見つかりません',
  INSUFFICIENT_FUNDS: '残高が不足しています',
  LIMIT_EXCEEDED: '利用上限を超えています',
  RATE_LIMITED: '短時間に決済が集中しています。しばらく待ってから再度お試しください',
  INVALID_AMOUNT: '金額が正しくありません',
  TOKEN_INVALID: 'QRコードが無効です',
  TOKEN_EXPIRED: 'QRコードの有効期限が切れています',
  TOKEN_USED: 'このQRコードはすでに使用されています',
  NOT_MERCHANT_OWNER: 'この店舗の操作権限がありません',
  MERCHANT_NOT_FOUND: '店舗が見つかりません',
  REQUEST_NOT_FOUND: '決済リクエストが見つかりません',
  REQUEST_EXPIRED: '決済リクエストの有効期限が切れています',
  REQUEST_NOT_OPEN: 'この決済リクエストはすでに処理済みです',
  USER_NOT_FOUND: '相手が見つかりません',
  SELF_TRANSFER: '自分自身には送金できません',
  SPLIT_TOTAL_MISMATCH: '割り勘の合計が一致しません',
  SPLIT_MEMBER_NOT_FOUND: '割り勘の対象が見つかりません',
  ALREADY_PAID: 'すでに支払い済みです',
  ALREADY_REFUNDED: 'すでに返金済みです',
  NOT_REFUNDABLE: 'この取引は返金できません',
  COUPON_INVALID: 'クーポンが利用できません',
  COUPON_USED: 'このクーポンは使用済みです',
  COUPON_MIN_AMOUNT: 'クーポンの最低利用金額を満たしていません',
  COUPON_NOT_FOR_MERCHANT: 'この店舗では利用できないクーポンです',
  COUPON_EXHAUSTED: 'クーポンの配布上限に達しました',
  COUPON_ALREADY_CLAIMED: 'このクーポンはすでに獲得済みです',
  PIN_NOT_SET: 'PINが設定されていません',
  PIN_INVALID: 'PINが正しくありません',
  PIN_LOCKED: 'PINがロックされています。10分後に再度お試しください',
  PIN_REQUIRED: '本人確認（PIN）が必要です',
  PIN_FORMAT: 'PINは4〜6桁の数字で設定してください',
  HANDLE_TAKEN: 'このIDはすでに使われています',
  NOT_ADMIN: '管理者権限が必要です',
  WALLET_NOT_FOUND: 'ウォレットが見つかりません',
};

export class RpcError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
  }
}

/** Supabase / PostgREST のエラーを画面表示用の日本語に変換する */
export function toUserMessage(error: unknown): string {
  if (error instanceof RpcError) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: unknown }).message);
    const code = extractCode(msg);
    if (code) return RPC_MESSAGES[code] ?? msg;
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return '通信に失敗しました。接続を確認してください';
    }
    return msg;
  }
  return '予期しないエラーが発生しました';
}

/** raise exception 'INSUFFICIENT_FUNDS' の message からコードを取り出す */
export function extractCode(message: string): string | null {
  const m = /^([A-Z][A-Z0-9_]+)$/.exec(message.trim());
  return m?.[1] ?? null;
}

export function isRpcCode(error: unknown, code: string): boolean {
  if (error instanceof RpcError) return error.code === code;
  if (error && typeof error === 'object' && 'message' in error) {
    return extractCode(String((error as { message: unknown }).message)) === code;
  }
  return false;
}
