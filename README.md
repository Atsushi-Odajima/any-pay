# Any Pay — QRコード決済アプリ（ポートフォリオ / PWA）

PayPay / d払いに相当するQRコード決済アプリを、Web アプリ（PWA）として実装したポートフォリオです。

> **実際のお金は一切動きません。** 残高はすべて架空で、資金決済法・犯罪収益移転防止法の要件は対象外です。

## 技術スタック
React 19 + Vite + TypeScript / Tailwind CSS / React Router / TanStack Query / Supabase（Auth, Postgres, RLS, RPC, Realtime）/ vite-plugin-pwa

## 開発
```bash
cp .env.example .env   # Supabase の URL / anon key を設定
npm install
npm run dev
```

（Phase 7 で構成図・設計判断・デモアカウントを追記）
