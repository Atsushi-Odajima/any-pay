# PROGRESS.md — 進捗ログ

> iPhone から読む前提で簡潔に。各フェーズ終了時に更新。

## 現在地
- Phase 5 完了。次は Phase 6（クーポン・ポイント・通知・セキュリティ）

## 環境メモ（このセッションの制約）
- Docker / Supabase CLI が使えない環境のため、`supabase init` は `supabase/config.toml` を手書きで代替
- `supabase gen types` はリンク済みプロジェクトが必要なため、`src/types/database.ts` は gen types と同じ形式で手書き。`npm run gen:types` で再生成可能
- SQL テストはローカルの PostgreSQL 16 で Supabase 相当のロール・`auth.uid()` を再現して実行（`tests/sql/run.sh`）

## Phase 0 — 足場 ✅
- 完了内容：Vite + React 19 + TS strict、Tailwind v4、React Router v7、TanStack Query、Zustand、vite-plugin-pwa（manifest / SW / オフラインシェル）、ESLint（Supabase 直 import 禁止・window 直参照禁止ルール込み）、Prettier、Vitest。下タブレイアウトとダミー画面、PWA アイコン生成スクリプト（`npm run gen:icons`）
- 手動確認：`npm run dev` → http://localhost:5173 を開き、Chrome の「ホーム画面に追加」または Safari の共有 → ホーム画面に追加
- 既知の課題：なし
- 次：Phase 1

## Phase 1 — 認証・プロフィール・スキーマ ✅
- 完了内容：`0001_schema.sql`（§3 の全テーブル・enum・profiles→wallet 自動作成トリガー・`public_profiles` / `point_balances` ビュー・全テーブル RLS・列単位の grant/revoke）。`src/types/database.ts`（gen types 形式）。電話番号 + OTP ログイン、オンボーディング（handle・表示名）、プロフィール編集、その他タブ（ログアウト）。ルートガード（未ログイン→/login、プロフィール未作成→/onboarding）
- SQLテスト（`npm run test:sql`）：他人の profile / wallet が見えない、wallets / transactions / ledger への直接書き込みが permission denied、`role` / `pin_hash` の直接更新不可、他人 id での profile 作成不可、anon は全テーブル不可
- 手動確認：Supabase Auth → Phone を有効化し Test OTP（例 `+819000000001` / `123456`）を登録 → `/login` で番号入力 → コード入力 → `/onboarding` で ID と表示名 → ホームへ
- 判断メモ：Supabase の `postgres` ロールは BYPASSRLS を持つため、`security definer` 関数は RLS を越えて動く（ローカルテストでも superuser で同等）。RLS ポリシー内の wallet 判定は `my_wallet_ids()`（security definer）で一度だけ評価させる
- 既知の課題：`supabase gen types` は未実行（CLI 無し）。プロジェクト link 後に `npm run gen:types` で差分がないことを確認する
- 次：Phase 2

## Phase 2 — 台帳・チャージ・履歴 ✅
- 完了内容：`0002_ledger.sql`（treasury wallet、ledger 合計0の遅延制約トリガー、ledger の UPDATE/DELETE 拒否トリガー、`_begin_idempotent`（advisory lock + 既存返却）、`_post_transaction`（id 昇順 FOR UPDATE → 残高確認 → transactions + ledger → balance_cache）、`charge_wallet`、`withdraw`）。ホーム（残高・ポイント・支払うボタン・直近3件）、チャージ（方法 → 金額 → 確認 → 完了）、出金、履歴（月別・種別フィルタ・balance_after 表示）、明細、完了画面（音・振動・アニメーション）
- SQLテスト：(a) 同一 idempotency_key 2回 → 1取引 (b) 合計0違反 → LEDGER_UNBALANCED (c) 残高不足 → INSUFFICIENT_FUNDS (d) 1回上限 / 残高上限 → LIMIT_EXCEEDED。加えて：同一キー・異金額 / 他人のキー → IDEMPOTENCY_KEY_CONFLICT、ledger は superuser でも UPDATE/DELETE 不可、balance_cache = sum(ledger)
- 判断メモ：treasury は RPC が依存するため seed ではなく migration で固定 id（`00000000-…-0001`）で作成。`_post_transaction` に `p_subsidy` を持たせ、全店共通クーポンの割引分を treasury → 加盟店に補填する仕訳を同一取引内で書ける設計（Phase 6 で使用）。`withdraw` は `p_wallet_id`（省略可）で加盟店 wallet からの出金にも対応
- 手動確認：ログイン → ホーム「チャージ」→ 銀行 → 10,000 → チャージする → 完了画面 → 履歴に「チャージ +¥10,000 残高 ¥10,000」
- 次：Phase 3

## Phase 3 — QR決済 ✅
- 完了内容：`0003_qr_payments.sql`（`register_merchant`、`create_qr_token`、`pay_with_token`、`create_payment_request` / `get_payment_request` / `cancel_payment_request`、`pay_request`、`pay_static`、共通 `_settle_payment`（レート制限 → クーポン → 記帳 → ポイント → 双方通知）、Realtime publication）。QR ペイロード解析（zod、URL 形式も可）、QR 表示（60秒自動更新・残り秒数・使用済み/期限切れは即再発行）、スキャナ（BarcodeDetector 優先 → zxing、カメラ不可時は手入力フォールバック）、決済確認（動的：金額固定・残り時間 / 静的：金額入力）、加盟店の受付画面（金額 → 動的QR（2秒ポーリングで paid 検知）/ お客様のQRを読む → 金額 → 決済）、店舗登録
- SQLテスト：失効・偽・使用済み・期限切れトークン、非オーナーの `pay_with_token`、残高不足時にトークン未消費、冪等リプレイ、動的QRの二重支払い / 期限切れ / キャンセル、静的QR、20回/分レート制限、台帳整合
- 判断メモ：`register_merchant` は Phase 5 予定だったが受付画面の動作に必要なため前倒し（1オーナー1店舗）。`get_payment_request` は支払う側が店名・金額を確認するための security definer RPC（id は推測不能な uuid）。クーポン適用ロジック（`_apply_coupon`）は決済 RPC の引数に含まれるため Phase 3 で実装し、Phase 6 でテスト・UI を追加する。ユーザー提示型の完了検知は `notifications` の Realtime INSERT
- 手動確認（ブラウザ2窓）：A: `/pay` で QR 表示 → B: その他 → 店舗登録 → 受付「お客様のQRを読む」→ A の QR を読む → 金額 → 決済 → A が自動で完了画面。B: 受付「QRを提示」→ 金額 → A: スキャン → 確認 → 支払う。静的は Phase 5 の印刷ページで
- 既知の課題：Realtime は Supabase ダッシュボードで `transactions` / `notifications` / `payment_requests` の publication が有効であること（migration で追加済み）
- 次：Phase 4

## Phase 4 — 送金・受取・割り勘 ✅
- 完了内容：`0004_transfers.sql`（`transfer`：50,000円/回・自分宛て不可・handle 正規化・受取通知、`create_split_request`：合計一致/重複/作成者除外/存在チェック・各メンバーに通知、`pay_split`：本人のみ・二重支払い拒否・作成者へ通知（全員完了メッセージ））。送る（ID 前方一致検索 or 受取QR読み取り → 金額・メッセージ → 確認 → 完了）、受け取る（`ap1:p:<handle>` QR・ID コピー・リンク共有）、割り勘（合計・メンバー追加・均等按分（端数は先頭から）・作成 → 状況一覧・メンバーの支払いボタン）
- SQLテスト：A→B 送金後の両者の残高・履歴・通知、第三者に不可視、冪等、各種拒否、割り勘の検証 5 種、参加者のみ閲覧、非メンバーの支払い拒否、3人全員支払い後に完了
- 判断メモ：メンバー名は `split_members` → `public_profiles` を `in` で引く2クエリ方式（profiles は本人しか読めないため）。割り勘の1人あたり上限も送金と同じ 50,000 円
- 手動確認：A: 送る → @bob を検索 → 3,000 → 送金 → B のホームに +¥3,000。A: 割り勘 → 作成 → B/C に通知 → B: 割り勘 → 支払う → A の一覧が 1/2 → C も支払うと「全員支払い済み」
- 次：Phase 5

## Phase 5 — 加盟店ダッシュボード ✅
- 完了内容：`0005_merchant.sql`（`refund_transaction`：逆仕訳で全額返金・元取引 refunded・ポイント取消・クーポン復活・補填分は treasury へ戻す・冪等キー `refund:<元取引id>`、`merchant_today_summary`：JST 本日の売上/件数/返金/純売上）。店舗ホーム（本日売上・店舗残高・直近決済・Realtime で即時反映＋音/振動/トースト）、決済一覧（月別）、決済明細（クーポン内訳・返金ボタン・返金取引へのリンク）、静的QR印刷ページ（A4・店名入り・URL 形式 QR）、店舗出金
- SQLテスト：返金はオーナーのみ、二重返金拒否、決済以外/不存在は不可、店舗残高不足は拒否（元取引は変わらない）、返金後にユーザー残高・ポイントが戻る、本日売上の集計
- 判断メモ：返金の冪等キーは元取引 id から決定的に生成（クライアントがキーを持つ必要がない）。売上サマリは RPC で JST 日付境界を計算（フロントで集計しない）
- 手動確認：A が決済 → B の店舗ホームに即時トースト＋一覧追加。B: 決済 → 明細 → 全額返金 → A の残高・ポイントが戻り、履歴で打ち消し線
- 次：Phase 6
