import { defineConfig, devices } from '@playwright/test';

/**
 * E2E（主要フロー1本）。実際の Supabase プロジェクトと Test OTP が必要。
 *   E2E_BASE_URL   例: http://localhost:5173（未指定なら dev サーバーを起動）
 *   E2E_PHONE_USER 例: +819000000001（Test OTP 登録済み）
 *   E2E_OTP        例: 123456
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    ...devices['iPhone 13'],
    locale: 'ja-JP',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
});
