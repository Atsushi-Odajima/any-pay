/** <html lang> を更新する（スクリーンリーダー・フォント選択のため）。Capacitor でも同じ */
export function setDocumentLang(lang: string): void {
  try {
    document.documentElement.lang = lang;
  } catch {
    // SSR / テスト環境では無視
  }
}

/** アプリが前面に戻ったとき（タブ復帰・ホーム画面アプリの再表示）に呼ぶ。解除関数を返す */
export function onAppForeground(callback: () => void): () => void {
  try {
    const handler = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  } catch {
    return () => undefined;
  }
}
