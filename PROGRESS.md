# PROGRESS.md — 進捗ログ

> iPhone から読む前提で簡潔に。各フェーズ終了時に更新。

## 現在地
- Phase 1 完了。次は Phase 2（台帳・チャージ・履歴）

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
