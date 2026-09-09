# CLAUDE.md — Any Pay QRコード決済アプリ

> このファイルはClaude Codeへの指示書。作業開始時に必ずこのファイルと `PROGRESS.md` を読むこと。

## 0. プロジェクトの目的と割り切り

- 目的：**ポートフォリオ**。PayPay / d払いに相当するQRコード決済アプリを、Webアプリ（PWA）として「全機能」実装する
- 評価されたいポイント：見た目ではなく **「お金を扱うシステムを正しく設計・実装できる」** こと
  - 二重記帳の台帳、原子的な残高更新、冪等性、RLSによるアクセス制御、ワンタイムQRの失効管理
- **実際のお金は一切動かない**。残高は架空。資金決済法・犯収法の要件は対象外（READMEに明記する）
- 将来 Capacitor で iOS アプリ化する。移行を容易にする設計ルールを守る（§6）
- ブランド：黒基調のオリジナルUI。PayPay等のロゴ・配色・文言をコピーしない

## 1. 技術スタック（固定。変更しない）

| 層 | 採用 |
|---|---|
| フロント | React 19 + Vite + TypeScript（strict）、React Router、TanStack Query、Zustand（UI状態のみ）、Tailwind CSS、lucide-react、react-hook-form + zod |
| PWA | vite-plugin-pwa（manifest、Service Worker、オフラインシェル） |
| QR | 読み取り `@zxing/browser`（`BarcodeDetector` が使える環境では優先）、生成 `qrcode` |
| バックエンド | Supabase：Auth / Postgres / RLS / RPC（SQL関数）/ Realtime / Edge Functions |
| デプロイ | Cloudflare Pages（フロント）、Supabase Free Tier |
| テスト | Vitest（純粋ロジック）、SQLテスト（RPC・制約）、Playwright（主要フローのみ、任意） |
| 品質 | ESLint、Prettier、`supabase gen types` による型生成 |

- 金額はすべて **円・整数（bigint）**。小数は扱わない
- UIは日本語。モバイルファースト（基準幅 390px、下タブナビ）

## 2. ディレクトリ構成

```
/
├─ CLAUDE.md            # 本ファイル
├─ PROGRESS.md          # 進捗ログ（各フェーズ終了時に更新）
├─ README.md
├─ supabase/
│  ├─ migrations/       # 0001_xxx.sql ... 追記のみ。既存ファイルは編集禁止
│  ├─ functions/        # Edge Functions（Push、Stripe webhook）
│  └─ seed.sql          # デモデータ
├─ src/
│  ├─ app/              # ルーター、Provider、レイアウト、下タブ
│  ├─ features/
│  │  ├─ auth/          # ログイン、プロフィール
│  │  ├─ wallet/        # 残高、チャージ、出金
│  │  ├─ qr/            # QR表示、スキャン、ペイロード解析
│  │  ├─ payment/       # 決済（ユーザー提示 / 店舗提示）
│  │  ├─ transfer/      # 送金、受取、割り勘
│  │  ├─ history/       # 取引履歴・明細
│  │  ├─ merchant/      # 加盟店ダッシュボード
│  │  ├─ rewards/       # クーポン、ポイント
│  │  ├─ notifications/
│  │  └─ security/      # PIN、WebAuthn
│  ├─ shared/
│  │  ├─ ui/            # 汎用コンポーネント
│  │  ├─ lib/           # supabaseクライアント、金額フォーマット、日付
│  │  └─ platform/      # camera / haptics / biometrics / push の抽象層（§6）
│  └─ types/database.ts # supabase gen types の出力
└─ tests/
```

各 `features/<domain>/` は `api.ts`（Supabase呼び出し）、`hooks.ts`、`components/`、`pages/` で構成する。

## 3. データモデル

### 3.1 設計原則（最重要）

1. **残高を変更するコードはSQL関数（RPC）の中にしか書かない。** フロントでの加減算は禁止
2. `wallets` / `transactions` / `ledger_entries` / `point_entries` へのクライアント直接 INSERT / UPDATE / DELETE は RLS で拒否する。書き込みは `security definer` のRPC経由のみ
3. `ledger_entries` は追記専用。UPDATE / DELETE 権限を付与しない
4. 1つの `transactions` に紐づく `ledger_entries.amount` の合計は **必ず 0**（遅延制約トリガーで担保）
5. 残高更新時は関係する `wallets` を **id昇順で `SELECT ... FOR UPDATE`** し、デッドロックを防ぐ
6. すべての金銭系RPCは `idempotency_key` を受け取り、重複呼び出しでは既存の transaction を返す

### 3.2 テーブル

```sql
create type wallet_kind as enum ('user','merchant','system');
create type tx_type     as enum ('charge','payment','transfer','withdrawal','refund','split');
create type tx_status   as enum ('pending','completed','failed','refunded');
create type user_role   as enum ('user','merchant','admin');

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url   text,
  role         user_role not null default 'user',
  pin_hash     text,                          -- pgcrypto crypt()
  created_at   timestamptz not null default now()
);

create table wallets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references profiles(id), -- system は null
  kind          wallet_kind not null,
  balance_cache bigint not null default 0,
  updated_at    timestamptz not null default now(),
  constraint non_negative check (kind = 'system' or balance_cache >= 0)
);
-- system wallet は seed で1つ作成：treasury（チャージ元・出金先）

create table merchants (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profiles(id),
  wallet_id  uuid not null references wallets(id),
  name       text not null,
  category   text,
  address    text,
  logo_url   text,
  created_at timestamptz not null default now()
);

create table transactions (
  id              uuid primary key default gen_random_uuid(),
  type            tx_type not null,
  status          tx_status not null default 'pending',
  amount          bigint not null check (amount > 0),
  from_wallet_id  uuid references wallets(id),
  to_wallet_id    uuid references wallets(id),
  merchant_id     uuid references merchants(id),
  memo            text,
  idempotency_key text unique not null,
  created_by      uuid not null references profiles(id),
  metadata        jsonb not null default '{}',   -- クーポン適用、決済方式などを記録
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create table ledger_entries (
  id             bigserial primary key,
  transaction_id uuid not null references transactions(id),
  wallet_id      uuid not null references wallets(id),
  amount         bigint not null check (amount <> 0), -- 正=入金 / 負=出金
  balance_after  bigint not null,
  created_at     timestamptz not null default now()
);

create table qr_tokens (            -- ユーザー提示型
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id),
  token      text unique not null,  -- 32byte乱数 base64url
  expires_at timestamptz not null,  -- 発行から60秒
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table payment_requests (     -- 店舗提示型（動的QR）
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id),
  amount              bigint not null check (amount > 0),
  memo                text,
  status              text not null default 'open' check (status in ('open','paid','expired','cancelled')),
  expires_at          timestamptz not null,  -- 発行から5分
  paid_transaction_id uuid references transactions(id),
  created_at          timestamptz not null default now()
);

create table split_requests (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references profiles(id),
  total_amount bigint not null check (total_amount > 0),
  memo         text,
  created_at   timestamptz not null default now()
);
create table split_members (
  id                  uuid primary key default gen_random_uuid(),
  split_request_id    uuid not null references split_requests(id),
  user_id             uuid not null references profiles(id),
  amount              bigint not null check (amount > 0),
  paid_transaction_id uuid references transactions(id),
  unique (split_request_id, user_id)
);

create table coupons (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid references merchants(id), -- null = 全店共通
  title         text not null,
  discount_type text not null check (discount_type in ('fixed','percent')),
  value         int not null check (value > 0),
  min_amount    bigint not null default 0,
  valid_from    timestamptz not null default now(),
  valid_until   timestamptz not null,
  max_uses      int
);
create table user_coupons (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references coupons(id),
  user_id        uuid not null references profiles(id),
  used_at        timestamptz,
  transaction_id uuid references transactions(id),
  unique (coupon_id, user_id)
);

create table point_entries (        -- 決済額の0.5%を付与（切り捨て）
  id             bigserial primary key,
  user_id        uuid not null references profiles(id),
  delta          int not null,
  reason         text not null,
  transaction_id uuid references transactions(id),
  created_at     timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id),
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
```

### 3.3 トリガー・ビュー

- `auth.users` INSERT → `profiles` は作らない（オンボーディングでhandle入力後に作成）。`profiles` INSERT → `wallets(kind='user')` を自動作成
- `ledger_entries` 遅延制約トリガー：transaction ごとの `sum(amount) = 0` を検証
- ビュー `public_profiles(id, handle, display_name, avatar_url)`：送金相手検索用。`pin_hash` 等は露出しない
- ビュー `point_balances(user_id, balance)`

### 3.4 RLS方針

| テーブル | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| profiles | 本人のみ全列（検索は `public_profiles` 経由） | 本人のみ（`role`, `pin_hash` は直接更新不可、RPC経由） |
| wallets | owner のみ | 不可 |
| transactions / ledger_entries | 自分の wallet が関与する行のみ。加盟店オーナーは自店の行 | 不可 |
| merchants | 全ユーザー（公開情報） | owner のみ |
| qr_tokens / payment_requests | 発行者のみ | RPC経由のみ |
| coupons | 全ユーザー | merchant owner のみ |
| user_coupons / point_entries / notifications | 本人のみ | notifications の `read_at` 更新のみ本人可、他は不可 |

## 4. RPC（SQL関数）一覧

すべて `security definer`、先頭で `auth.uid()` を検証。失敗は `raise exception` で明確なエラーコード（例：`INSUFFICIENT_FUNDS`, `TOKEN_EXPIRED`, `TOKEN_USED`, `LIMIT_EXCEEDED`, `NOT_MERCHANT_OWNER`）を返す。

| 関数 | 呼び出し側 | 振る舞い |
|---|---|---|
| `create_qr_token()` | ユーザー | 未使用トークンを失効させ、新規発行。`{token, expires_at}` を返す |
| `pay_with_token(p_token, p_amount, p_merchant_id, p_idempotency_key)` | 加盟店オーナー | トークン検証（期限・未使用）→ 残高確認 → transaction + ledger 2行 → 残高キャッシュ更新 → token 使用済み → ポイント付与 → 双方に通知 |
| `create_payment_request(p_amount, p_memo)` | 加盟店オーナー | 動的QR用リクエスト発行（5分） |
| `pay_request(p_request_id, p_idempotency_key, p_user_coupon_id?)` | ユーザー | リクエスト検証 → クーポン適用 → 決済 |
| `pay_static(p_merchant_id, p_amount, p_idempotency_key, p_user_coupon_id?)` | ユーザー | 静的QR（金額はユーザー入力）決済 |
| `charge_wallet(p_amount, p_method, p_idempotency_key)` | ユーザー | treasury → user。1回 1〜100,000円、残高上限 1,000,000円。`p_method` は表示用（bank/card/convenience） |
| `withdraw(p_amount, p_idempotency_key)` | ユーザー / 加盟店 | wallet → treasury。手数料0（デモ） |
| `transfer(p_to_handle, p_amount, p_memo, p_idempotency_key)` | ユーザー | 個人間送金。1回上限 50,000円。自分宛て不可 |
| `create_split_request(p_total, p_members jsonb, p_memo)` | ユーザー | `[{handle, amount}]`。合計＝total を検証 |
| `pay_split(p_split_member_id, p_idempotency_key)` | 割り勘メンバー | creator へ transfer し member を支払済みに |
| `refund_transaction(p_transaction_id)` | 加盟店オーナー | 逆仕訳で全額返金。元取引を `refunded` に。ポイントも取り消し |
| `set_pin(p_pin)` / `verify_pin(p_pin)` | ユーザー | `crypt()` でハッシュ。verify は5回失敗で10分ロック |
| `reconcile_wallets()` | admin | `balance_cache` と ledger 合計の不一致一覧を返す |

共通の内部関数 `_post_transaction(...)` に「ロック → 残高確認 → transactions/ledger 書き込み → キャッシュ更新」を集約し、各RPCはそれを呼ぶ。

## 5. QRペイロード仕様

| 形式 | 用途 | 読み取った側の処理 |
|---|---|---|
| `ap1:u:<token>` | ユーザー提示（支払い） | 加盟店が金額を入力して `pay_with_token` |
| `ap1:r:<request_id>` | 店舗提示・動的（金額固定） | ユーザーが確認して `pay_request` |
| `ap1:s:<merchant_id>` | 店舗提示・静的（印刷用） | ユーザーが金額入力して `pay_static` |
| `ap1:p:<handle>` | 個人の受取QR | 送金画面に遷移し `transfer` |

- `ap1` はバージョン接頭辞。解析は `features/qr/payload.ts` に集約し、zod で検証。未知形式はエラー表示
- ユーザー提示QRは画面上で60秒ごとに自動更新し、残り秒数を表示。使用済み・期限切れは即時に再発行

## 6. iOSアプリ化（Capacitor）への移行ルール

- **UIコンポーネントは Supabase を直接 import しない。** 必ず `features/*/api.ts` → `shared/lib/supabase.ts` を経由
- ハード依存機能は `shared/platform/` の抽象インターフェース経由で使う。今は Web 実装、後で Capacitor 実装に差し替える
  - `camera.ts`（getUserMedia）、`haptics.ts`（`navigator.vibrate`）、`biometrics.ts`（WebAuthn）、`push.ts`（Web Push）
- ルーティングは hash を使わず history。Capacitor でもそのまま動く
- 環境変数は `import.meta.env` を `shared/lib/env.ts` で一箇所にラップ
- `window` / `document` 直参照は `shared/platform/` の外に書かない

## 7. 画面一覧

ユーザー側（下タブ：ホーム / 支払う / 送る / 履歴 / その他）
1. オンボーディング：電話番号入力 → OTP → handle・表示名設定
2. ホーム：残高、ポイント、「支払う」大ボタン、直近履歴3件、未読通知バッジ
3. 支払う：ユーザー提示QR（自動更新）＋「スキャンする」切替
4. スキャン → 決済確認（店名・金額・クーポン選択・PIN or 生体認証）→ 完了（音・振動・アニメーション）
5. チャージ：方法選択（銀行 / カード / コンビニ ※UIのみ）→ 金額 → 完了
6. 送る：handle検索 or QR読み取り → 金額・メモ → 確認 → 完了
7. 受け取る：自分の受取QR、handle表示、コピー
8. 割り勘：合計・メンバー・按分 → 作成 → 各メンバーに通知 → 支払い状況一覧
9. 履歴：月別、種別フィルタ、明細（balance_after を表示）
10. クーポン一覧・獲得、ポイント履歴
11. 通知一覧
12. 設定：プロフィール、PIN設定、生体認証ON/OFF、出金、加盟店登録、ログアウト

加盟店側（`role='merchant'` またはmerchant保有者に表示）
13. 店舗登録
14. 店舗ホーム：本日売上・件数、直近決済（Realtimeで即時追加）
15. 決済受付：金額入力 → 動的QR表示 / スキャンモード（ユーザーQRを読む）
16. 決済一覧・明細・返金
17. 静的QR印刷ページ（A4想定、店名入り）
18. クーポン作成
19. 出金

## 8. セキュリティ（デモ範囲での実装）

- ワンタイムQR：60秒失効、1回限り、使用後即無効
- 動的リクエスト：5分失効
- 利用上限：送金 50,000円/回、チャージ 100,000円/回、残高 1,000,000円、決済回数 20回/分（RPC内で検査）
- PIN：サーバー側ハッシュ照合。連続失敗ロック
- WebAuthn（Face ID / Touch ID）：`navigator.credentials` によるクライアント側の再認証ゲート。**サーバー側の認可には使っていない**ことを README に明記
- RLS 全テーブル有効。`anon` キーのみフロントに置く。`service_role` は Edge Functions のみ
- Realtime は `notifications` と `transactions` の本人行のみ購読

## 9. 開発フェーズと完了条件（DoD）

各フェーズは DoD を満たしてからコミットし、次へ進む。コミットメッセージは `feat(phaseN): ...` / `chore(phaseN): ...`。

### Phase 0 — 足場
- Vite + React + TS、Tailwind、Router、TanStack Query、vite-plugin-pwa、ESLint/Prettier、Vitest
- `supabase init`、`.env.example`、`PROGRESS.md`、README骨子
- 下タブレイアウトとダミー画面
- DoD：`npm run dev` でPWAシェルが表示され、ホーム画面に追加できる。`npm run typecheck && npm run lint && npm run test` が通る

### Phase 1 — 認証・プロフィール・スキーマ
- migration 0001：§3 の全テーブル、enum、トリガー、ビュー、RLS、権限（revoke）
- `supabase gen types` → `src/types/database.ts`
- ログイン（電話番号 + OTP。Supabase の Test OTP 設定前提）、オンボーディング、wallet 自動作成
- DoD：2アカウントでログインし、SQLテストで「他人の wallet / transactions が見えない」「クライアントから wallets を UPDATE できない」を確認

### Phase 2 — 台帳・チャージ・履歴
- `_post_transaction`、`charge_wallet`、`withdraw`、ledger 合計0トリガー、`balance_after`
- ホーム残高、チャージ画面、履歴一覧
- DoD：SQLテストで (a) 同一 idempotency_key の2回呼び出しが1取引になる (b) 合計0違反が拒否される (c) 残高不足が拒否される (d) 上限超過が拒否される

### Phase 3 — QR決済
- `create_qr_token`、`pay_with_token`、`create_payment_request`、`pay_request`、`pay_static`
- QR表示（自動更新）、スキャナ、決済確認・完了画面、加盟店の最小受付画面（金額入力 → QR / スキャン）
- DoD：ブラウザ2窓（ユーザー / 加盟店）で3方式すべて決済成功。期限切れ・二重使用・残高不足・他人のトークンが拒否される

### Phase 4 — 送金・受取・割り勘
- `transfer`、`create_split_request`、`pay_split`、handle検索（`public_profiles`）
- 送る / 受け取る / 割り勘画面、履歴明細
- DoD：A→B送金後、両者の履歴と残高が整合。割り勘3人で全員支払い後に状況一覧が完了表示

### Phase 5 — 加盟店ダッシュボード
- 店舗登録、店舗ホーム（本日売上・Realtime）、決済一覧、`refund_transaction`、出金、静的QR印刷
- DoD：ユーザーが決済した瞬間に店舗ホームへ反映。返金後にユーザー残高・ポイントが戻り、元取引が `refunded`

### Phase 6 — クーポン・ポイント・通知・セキュリティ
- クーポン作成・獲得・適用、ポイント付与/取消、`notifications` Realtime、通知一覧
- `set_pin` / `verify_pin`、決済前PINゲート、WebAuthn ゲート、レート制限
- Web Push（VAPID、Edge Function）は任意。実装する場合 iOS はホーム画面追加時のみ動くと README に記載
- DoD：クーポン適用額が台帳と一致。PIN 5回失敗でロック。通知が即時に届く

### Phase 7 — 仕上げ
- `reconcile_wallets`、`seed.sql`（ユーザー3・加盟店2・クーポン数点）、Playwright で決済フロー1本
- README：構成図（mermaid）、デモアカウント、設計判断（なぜ二重記帳か、なぜRPCか、冪等性、ロック順）、デモの割り切り一覧、iOS化計画
- Cloudflare Pages デプロイ、Lighthouse PWA/Performance 90以上
- DoD：README だけ読めば第三者が5分で動かせる

### Phase 8（任意）— Stripe テストモードでチャージ
- Edge Function：Checkout Session 作成（test mode）→ webhook `checkout.session.completed` → `charge_wallet` を `session_id` を idempotency_key として呼ぶ
- DoD：テストカードでチャージが反映。webhook 再送で二重計上されない

### Phase 9（将来）— Capacitor
- `shared/platform/` を Capacitor 実装に差し替え、GitHub Actions（macOS runner）で iOS ビルド

## 10. Claude Code 作業ルール

1. 作業開始時に `CLAUDE.md` と `PROGRESS.md` を読み、現在のフェーズから再開する
2. フェーズ順を守る。DoD を満たすまで次フェーズに進まない
3. コミット前に必ず `npm run typecheck && npm run lint && npm run test` を通す
4. 残高計算・変更はSQL関数のみ。フロントに金額の加減算ロジックを書かない
5. `supabase/migrations/` は新規ファイル追加のみ。既存ファイルは編集しない
6. 仕様にない判断が必要なときは「ポートフォリオで説明しやすい方」を選び、`PROGRESS.md` に理由を1行残す
7. 各フェーズ終了時に `PROGRESS.md` へ「完了内容 / 手動確認手順 / 既知の課題 / 次フェーズ」を短く書く（iPhoneから読む前提で簡潔に）
8. `.env` や鍵をコミットしない。`any` を使わない。console.log を残さない
9. 人間の作業が必要なもの（§11）に当たったら、その旨を `PROGRESS.md` に書いて可能な範囲で先に進む

## 11. 人間（Odaji）がやる作業

- [ ] Supabase プロジェクト作成 → `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を `.env` に設定
- [ ] Supabase Auth → Phone を有効化し、**Test OTPs** にテスト用電話番号と固定コードを登録（SMSプロバイダ契約は不要）
- [ ] `supabase link` してマイグレーションを push できる状態にする
- [ ] Cloudflare Pages にリポジトリを接続（ビルド `npm run build`、出力 `dist`）
- [ ] （Phase 8）Stripe テストアカウント作成、`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` を Edge Function の secrets に設定
- [ ] （Phase 9）Apple Developer Program 登録

## 12. 環境変数

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME="Any Pay"
# Edge Functions（Supabase secrets）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```
