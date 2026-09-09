import { getLocale, type Locale } from '@/shared/i18n';

const TZ = 'Asia/Tokyo';

type Fmts = {
  dateTime: Intl.DateTimeFormat;
  date: Intl.DateTimeFormat;
  time: Intl.DateTimeFormat;
  month: Intl.DateTimeFormat;
};

const cache: Partial<Record<Locale, Fmts>> = {};

function fmts(locale: Locale): Fmts {
  const cached = cache[locale];
  if (cached) return cached;
  const tag = locale === 'ja' ? 'ja-JP' : 'en-US';
  const f: Fmts = {
    dateTime: new Intl.DateTimeFormat(tag, {
      timeZone: TZ,
      year: 'numeric',
      month: locale === 'ja' ? '2-digit' : 'short',
      day: locale === 'ja' ? '2-digit' : 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    date: new Intl.DateTimeFormat(tag, {
      timeZone: TZ,
      month: locale === 'ja' ? 'numeric' : 'short',
      day: 'numeric',
      weekday: 'short',
    }),
    time: new Intl.DateTimeFormat(tag, {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    month: new Intl.DateTimeFormat(tag, { timeZone: TZ, year: 'numeric', month: 'long' }),
  };
  cache[locale] = f;
  return f;
}

export function formatDateTime(iso: string): string {
  return fmts(getLocale()).dateTime.format(new Date(iso));
}
export function formatDate(iso: string): string {
  return fmts(getLocale()).date.format(new Date(iso));
}
export function formatTime(iso: string): string {
  return fmts(getLocale()).time.format(new Date(iso));
}

/** "2026-09" 形式の月キー（JST） */
export function monthKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '00';
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return fmts(getLocale()).month.format(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 15)));
}

/** JST の月初〜翌月初を ISO で返す（履歴の月別フィルタ用） */
export function monthRange(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const year = y ?? 1970;
  const month = m ?? 1;
  // JST は UTC+9 固定（夏時間なし）
  const from = new Date(Date.UTC(year, month - 1, 1, -9, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, -9, 0, 0));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function currentMonthKey(now = new Date()): string {
  return monthKey(now.toISOString());
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 残り秒数（負にならない） */
export function secondsUntil(iso: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
}

export function isPast(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() <= now;
}

/** 4:59 形式 */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
