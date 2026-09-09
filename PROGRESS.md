# PROGRESS.md — 進捗ログ

> iPhone から読む前提で簡潔に。各フェーズ終了時に更新。

## 現在地
- Phase 0 完了。次は Phase 1（認証・プロフィール・スキーマ）

## 環境メモ（このセッションの制約）
- Docker / Supabase CLI が使えない環境のため、`supabase init` は `supabase/config.toml` を手書きで代替
- `supabase gen types` はリンク済みプロジェクトが必要なため、`src/types/database.ts` は gen types と同じ形式で手書き。`npm run gen:types` で再生成可能
- SQL テストはローカルの PostgreSQL 16 で Supabase 相当のロール・`auth.uid()` を再現して実行（`tests/sql/run.sh`）

## Phase 0 — 足場 ✅
- 完了内容：Vite + React 19 + TS strict、Tailwind v4、React Router v7、TanStack Query、Zustand、vite-plugin-pwa（manifest / SW / オフラインシェル）、ESLint（Supabase 直 import 禁止・window 直参照禁止ルール込み）、Prettier、Vitest。下タブレイアウトとダミー画面、PWA アイコン生成スクリプト（`npm run gen:icons`）
- 手動確認：`npm run dev` → http://localhost:5173 を開き、Chrome の「ホーム画面に追加」または Safari の共有 → ホーム画面に追加
- 既知の課題：なし
- 次：Phase 1
