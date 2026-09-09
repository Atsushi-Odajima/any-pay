// サンドボックスの承認画面（HTML）。外部プロバイダの「ホスト型決済ページ」を模擬する。
// 文言は日英併記（プロバイダ側の画面なのでアプリの辞書は使わない）
export interface PageInput {
  id: string;
  channel: string;
  method: string;
  amount: number;
  status: string;
  instructions: Record<string, unknown> | null;
  returnUrl: string;
  locale: string;
}

const BRAND: Record<string, { name: string; tagline: string; color: string }> = {
  bank_debit: {
    name: 'Any Bank',
    tagline: '口座振替（Direct debit）サンドボックス',
    color: '#2f6fed',
  },
  card: {
    name: 'Any Card Gateway',
    tagline: 'クレジット決済（Card）サンドボックス',
    color: '#8b5cf6',
  },
  konbini: {
    name: 'コンビニ端末シミュレーター',
    tagline: 'Convenience store terminal (sandbox)',
    color: '#f97316',
  },
  wallet: {
    name: 'Any Wallet',
    tagline: '電子マネー（E-money wallet）サンドボックス',
    color: '#10b981',
  },
};

export function brandOf(method: string) {
  return BRAND[method] ?? { name: 'Any Pay Sandbox', tagline: 'sandbox', color: '#c6ff4a' };
}

export function yen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function esc(s: unknown): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function layout(title: string, color: string, body: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{margin:0;background:#0f1115;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Hiragino Sans","Noto Sans JP",sans-serif}
  .wrap{max-width:420px;margin:0 auto;padding:24px 16px 48px}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:20px}
  .dot{width:14px;height:14px;border-radius:50%;background:${color}}
  .brand h1{font-size:18px;margin:0}
  .brand p{margin:0;font-size:12px;color:#9aa0a6}
  .card{background:#171a21;border:1px solid #262a33;border-radius:16px;padding:20px;margin-bottom:16px}
  .amount{font-size:34px;font-weight:700;margin:6px 0 2px}
  .muted{color:#9aa0a6;font-size:13px}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #262a33;font-size:14px}
  .row:first-child{border-top:0}
  label.opt{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #262a33;font-size:14px}
  input[type=text]{width:100%;box-sizing:border-box;background:#0f1115;border:1px solid #333845;border-radius:10px;color:#fff;padding:10px 12px;font-size:15px;margin-top:6px}
  .btn{display:block;width:100%;box-sizing:border-box;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;margin-top:10px}
  .primary{background:${color};color:#fff}
  .ghost{background:transparent;color:#c9cdd3;border:1px solid #333845}
  .code{font-family:ui-monospace,Menlo,monospace;font-size:22px;letter-spacing:2px}
  .note{font-size:12px;color:#9aa0a6;margin-top:16px}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:#262a33}
</style></head><body><div class="wrap">${body}</div></body></html>`;
}

/** 承認画面（status = created のとき） */
export function renderCheckout(p: PageInput): string {
  const b = brandOf(p.method);
  const header = `<div class="brand"><span class="dot"></span><div><h1>${esc(b.name)}</h1><p>${esc(b.tagline)}</p></div></div>`;
  const summary = `<div class="card"><div class="muted">Any Pay へのチャージ / Top-up to Any Pay</div><div class="amount">${yen(p.amount)}</div><div class="muted">支払い ID / Payment ID: <span class="badge">${esc(p.id)}</span></div></div>`;
  let form = '';
  if (p.method === 'bank_debit') {
    form = `<div class="card"><div class="muted">引き落とし口座を選択 / Choose an account</div>
      <label class="opt"><input type="radio" name="account" value="ordinary" checked> 普通 ****1234（Any Bank 渋谷支店）</label>
      <label class="opt"><input type="radio" name="account" value="checking"> 当座 ****5678（Any Bank 本店）</label>
      <p class="note">Any Pay が上記の口座から ${yen(p.amount)} を引き落とすことに同意します。<br>You authorize Any Pay to debit ${yen(p.amount)} from the selected account.</p></div>`;
  } else if (p.method === 'card') {
    form = `<div class="card"><div class="muted">カード情報（テスト用に入力済み）/ Card details (test values)</div>
      <input type="text" value="4242 4242 4242 4242" readonly><input type="text" value="12/34 &nbsp; CVC 123" readonly>
      <p class="note">テスト環境です。実際の請求は発生しません。<br>Test environment. No real charge is made.</p></div>`;
  } else if (p.method === 'konbini') {
    const code = String(p.instructions?.payment_code ?? '');
    form = `<div class="card"><div class="muted">払込番号 / Payment code</div><div class="code">${esc(code)}</div>
      <p class="note">レジでこの番号を伝えて支払うと、Any Pay に入金が通知されます。<br>Paying this code at the register notifies Any Pay.</p></div>`;
  } else {
    form = `<div class="card"><div class="muted">Any Wallet 残高 / Wallet balance</div><div class="amount" style="font-size:22px">${yen(1_000_000)}</div>
      <p class="note">Any Wallet の残高から Any Pay へチャージします。<br>Top up Any Pay from your Any Wallet balance.</p></div>`;
  }
  const approveLabel =
    p.method === 'konbini'
      ? 'レジで支払う / Pay at register'
      : p.method === 'bank_debit'
        ? '同意して引き落とす / Authorize debit'
        : '支払う / Pay';
  const declineLabel = p.method === 'konbini' ? '支払わずに戻る / Cancel' : '拒否する / Decline';
  const actions = `<form method="post"><button class="btn primary" name="outcome" value="approve">${approveLabel}</button>
    <button class="btn ghost" name="outcome" value="decline">${declineLabel}</button></form>
    <p class="note">これは Any Pay のポートフォリオ用サンドボックスです。実際のお金は動きません。<br>This is a sandbox for the Any Pay portfolio. No real money moves.</p>`;
  return layout(`${b.name} — ${yen(p.amount)}`, b.color, header + summary + form + actions);
}

/** 処理済み画面（再表示・戻るボタン用） */
export function renderResult(p: PageInput, webhookStatus: number | null): string {
  const b = brandOf(p.method);
  const label: Record<string, string> = {
    paid: '支払い完了 / Paid',
    declined: '拒否されました / Declined',
    cancelled: 'キャンセル / Cancelled',
    expired: '期限切れ / Expired',
    created: '未処理 / Pending',
  };
  const header = `<div class="brand"><span class="dot"></span><div><h1>${esc(b.name)}</h1><p>${esc(b.tagline)}</p></div></div>`;
  const body = `<div class="card"><div class="muted">結果 / Result</div><div class="amount" style="font-size:22px">${esc(label[p.status] ?? p.status)}</div>
    <div class="row"><span class="muted">金額 / Amount</span><span>${yen(p.amount)}</span></div>
    <div class="row"><span class="muted">支払い ID</span><span>${esc(p.id)}</span></div>
    <div class="row"><span class="muted">Webhook</span><span>${webhookStatus === null ? '未送信 / not sent' : `HTTP ${webhookStatus}`}</span></div></div>
    <a class="btn primary" style="text-align:center;text-decoration:none" href="${esc(p.returnUrl)}">Any Pay に戻る / Back to Any Pay</a>
    <form method="post" action="?resend=1"><button class="btn ghost" name="outcome" value="resend">通知を再送する（冪等性のデモ）/ Resend webhook</button></form>`;
  return layout(`${b.name} — ${esc(label[p.status] ?? p.status)}`, b.color, header + body);
}
