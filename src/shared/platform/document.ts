/** <html lang> を更新する（スクリーンリーダー・フォント選択のため）。Capacitor でも同じ */
export function setDocumentLang(lang: string): void {
  try {
    document.documentElement.lang = lang;
  } catch {
    // SSR / テスト環境では無視
  }
}
