import { useMemo } from 'react';
import { create } from 'zustand';
import { getItem, setItem } from '@/shared/platform/storage';
import { setDocumentLang } from '@/shared/platform/document';
import { ja } from './ja';
import { en } from './en';

export type Locale = 'ja' | 'en';
export type TParams = Record<string, string | number>;

const STORAGE_KEY = 'locale';

function initialLocale(): Locale {
  const saved = getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'ja';
}

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => {
    setItem(STORAGE_KEY, locale);
    setDocumentLang(locale);
    set({ locale });
  },
}));

setDocumentLang(useLocaleStore.getState().locale);

export function getLocale(): Locale {
  return useLocaleStore.getState().locale;
}

function lookup(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** 辞書引き。キーが無ければキー文字列をそのまま返す（自由文もそのまま通せる） */
export function translate(locale: Locale, key: string, params?: TParams): string {
  const dict = locale === 'en' ? en : ja;
  const value = lookup(dict, key) ?? lookup(ja, key) ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

export type TFunction = {
  (key: string, params?: TParams): string;
  (key: string | undefined, params?: TParams): string | undefined;
};

/** 現在の言語で辞書を引く t() を返す。言語切替で再レンダーされる */
function makeT(locale: Locale): TFunction {
  return ((key: string | undefined, params?: TParams) =>
    key === undefined ? undefined : translate(locale, key, params)) as TFunction;
}

/** 現在の言語で辞書を引く t() を返す。言語切替で再レンダーされる */
export function useT(): TFunction {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => makeT(locale), [locale]);
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  return [locale, setLocale];
}

/** React 外（エラー変換・ラベル関数）から現在の言語で引く */
export function tr(key: string, params?: TParams): string {
  return translate(getLocale(), key, params);
}
