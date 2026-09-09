import { test, expect } from '@playwright/test';

/**
 * 決済フロー1本：ログイン → チャージ → 静的QR決済 → 履歴に反映
 * 実行には Supabase プロジェクト・Test OTP・seed 済みの加盟店が必要。
 * 環境変数が無い場合はスキップする。
 */
const PHONE = process.env.E2E_PHONE_USER;
const OTP = process.env.E2E_OTP;
const MERCHANT_ID = process.env.E2E_MERCHANT_ID; // 静的QRの店舗 id（seed の Any Coffee など）

test.skip(
  !PHONE || !OTP || !MERCHANT_ID,
  'E2E_PHONE_USER / E2E_OTP / E2E_MERCHANT_ID を設定してください',
);

test('ログイン → チャージ → 静的QR決済 → 履歴', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('電話番号').fill(PHONE as string);
  await page.getByRole('button', { name: '認証コードを送る' }).click();
  await page.getByLabel('認証コード').fill(OTP as string);
  await page.getByRole('button', { name: 'ログイン' }).click();

  // オンボーディング未了なら handle を登録
  if (
    await page
      .getByRole('heading', { name: 'プロフィールを設定' })
      .isVisible({ timeout: 5_000 })
      .catch(() => false)
  ) {
    await page.getByLabel(/^ID/).fill(`e2e_${Date.now().toString(36)}`);
    await page.getByLabel('表示名').fill('E2E User');
    await page.getByRole('button', { name: 'はじめる' }).click();
  }
  await expect(page.getByTestId('balance')).toBeVisible();

  // チャージ 1,000 円
  await page.getByRole('link', { name: 'チャージ' }).click();
  await page.getByText('銀行口座').click();
  await page.getByLabel('金額').fill('1000');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.getByRole('button', { name: 'チャージする' }).click();
  await expect(page.getByRole('heading', { name: /チャージが完了しました/ })).toBeVisible();

  // 静的QR決済（/scan?d=ap1:s:<merchant_id> はカメラで読んだ場合と同じ着地点）
  await page.goto(`/scan?d=${encodeURIComponent(`ap1:s:${MERCHANT_ID}`)}`);
  await expect(page.getByRole('heading', { name: '支払い内容の確認' })).toBeVisible();
  await page.getByLabel('お支払い金額を入力').fill('300');
  await page.getByRole('button', { name: /を支払う/ }).click();
  // PIN 設定済みユーザーなら PIN シートが出る
  if (
    await page
      .getByText('PIN を入力')
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    for (const d of (process.env.E2E_PIN ?? '1234').split(''))
      await page.getByRole('button', { name: d, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: '支払いが完了しました' })).toBeVisible();

  // 履歴に反映
  await page.goto('/history');
  await expect(page.getByText('-¥300').first()).toBeVisible();
});
