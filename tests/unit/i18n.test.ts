import { afterEach, describe, expect, it } from 'vitest';
import { ja } from '@/shared/i18n/ja';
import { en } from '@/shared/i18n/en';
import { translate, tr, useLocaleStore } from '@/shared/i18n';
import { describeNotification } from '@/features/notifications/format';
import { formatDateTime, monthLabel } from '@/shared/lib/date';

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = String(v);
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => useLocaleStore.setState({ locale: 'ja' }));

describe('辞書の整合', () => {
  const fj = flatten(ja);
  const fe = flatten(en);
  it('ja と en のキー集合が一致する', () => {
    expect(Object.keys(fe).sort()).toEqual(Object.keys(fj).sort());
  });
  it('空文字の訳がない', () => {
    for (const [k, v] of Object.entries(fe)) expect(v, k).not.toBe('');
  });
  it('{param} プレースホルダが両言語で一致する', () => {
    for (const k of Object.keys(fj))
      expect(placeholders(fe[k] ?? ''), k).toEqual(placeholders(fj[k] ?? ''));
  });
});

describe('translate / tr', () => {
  it('言語ごとに辞書を引き、パラメータを埋め込む', () => {
    expect(
      translate('ja', 'notifications.paymentSent', { merchant: 'Any Coffee', amount: '¥1,500' }),
    ).toBe('Any Coffee に ¥1,500 を支払いました');
    expect(
      translate('en', 'notifications.paymentSent', { merchant: 'Any Coffee', amount: '¥1,500' }),
    ).toBe('You paid ¥1,500 to Any Coffee');
  });
  it('未知のキーはそのまま返す（RPC の生メッセージも通せる）', () => {
    expect(translate('en', 'errors.SOMETHING_NEW')).toBe('errors.SOMETHING_NEW');
    expect(translate('en', 'free text')).toBe('free text');
  });
  it('tr() はストアの現在言語を使う', () => {
    expect(tr('common.save')).toBe('保存');
    useLocaleStore.setState({ locale: 'en' });
    expect(tr('common.save')).toBe('Save');
  });
});

describe('describeNotification', () => {
  const base = { title: 'Any Coffee に ¥1,500 を支払いました', body: '7 ポイント獲得' };
  it('data が揃っていれば現在の言語で組み立てる', () => {
    useLocaleStore.setState({ locale: 'en' });
    const r = describeNotification({
      ...base,
      type: 'payment_sent',
      data: { amount: 1500, merchant_name: 'Any Coffee', points: 7 },
    });
    expect(r).toEqual({ title: 'You paid ¥1,500 to Any Coffee', body: 'Earned 7 points' });
  });
  it('割り勘：残人数 0 は完了文言', () => {
    useLocaleStore.setState({ locale: 'en' });
    const r = describeNotification({
      title: 'x',
      body: null,
      type: 'split_paid',
      data: { amount: 3000, payer_name: 'Bob', remaining: 0 },
    });
    expect(r.title).toBe('Bob paid ¥3,000 for the split');
    expect(r.body).toBe('Everyone has paid');
  });
  it('data が足りない古い通知はサーバーの title / body にフォールバックする', () => {
    useLocaleStore.setState({ locale: 'en' });
    expect(
      describeNotification({ ...base, type: 'payment_sent', data: { transaction_id: 'a' } }),
    ).toEqual(base);
  });
});

describe('日付の多言語表示', () => {
  const iso = '2026-09-09T03:04:05Z'; // JST 12:04
  it('月ラベルとタイムスタンプが言語に追従する', () => {
    expect(monthLabel('2026-09')).toBe('2026年9月');
    expect(formatDateTime(iso)).toContain('12:04');
    useLocaleStore.setState({ locale: 'en' });
    expect(monthLabel('2026-09')).toBe('September 2026');
    expect(formatDateTime(iso)).toMatch(/Sep/);
  });
});
