import { useLocale, type Locale } from '@/shared/i18n';
import type { Manual, ManualId } from './types';
import { manualsJa } from './ja';
import { manualsEn } from './en';

export type { Block, Manual, ManualId, Section } from './types';

export const MANUAL_IDS: readonly ManualId[] = ['user', 'merchant', 'admin'];

export function isManualId(value: string | undefined): value is ManualId {
  return MANUAL_IDS.includes(value as ManualId);
}

export function getManuals(locale: Locale): Manual[] {
  return locale === 'en' ? manualsEn : manualsJa;
}

/** 現在の表示言語の説明書一覧 */
export function useManuals(): Manual[] {
  const [locale] = useLocale();
  return getManuals(locale);
}
