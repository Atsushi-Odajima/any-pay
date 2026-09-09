// チャージ API のプロバイダ抽象。銀行連携 / クレジット / その他電子決済 を同じ形で扱う。
//   - createPayment: プロバイダ側に「支払い」を作り、承認画面 URL または払込番号を返す
//   - parseWebhook : プロバイダからの通知を検証し、正規化したイベントに変換する
export type Channel = 'bank' | 'card' | 'emoney';
export type Flow = 'redirect' | 'instructions';

export interface MethodSpec {
  provider: string;
  method: string;
  channel: Channel;
  flow: Flow;
}

export interface CreatePaymentInput {
  requestId: string;
  userId: string;
  amount: number; // 円（整数）
  channel: Channel;
  method: string;
  returnUrl: string; // アプリの処理状況画面（/charge/pending/<id>）
  webhookUrl: string; // このプロジェクトの charge-webhook/<provider>
  locale: string;
}

export interface CreatePaymentResult {
  providerRef: string;
  redirectUrl?: string;
  instructions?: Record<string, unknown>;
  status?: 'pending' | 'processing';
  expiresAt?: string;
}

export type EventKind = 'completed' | 'processing' | 'failed' | 'cancelled' | 'expired';

export interface ProviderEvent {
  requestId: string | null; // charge_requests.id（プロバイダの metadata / reference に載せている）
  providerRef: string;
  kind: EventKind;
  code?: string;
  payload: unknown;
}

export interface ChargeProvider {
  readonly id: string;
  methods(): MethodSpec[];
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  parseWebhook(req: Request, rawBody: string): Promise<ProviderEvent[]>;
}
