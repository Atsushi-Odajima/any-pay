// 端末ローカルの軽量設定（生体認証ON/OFF など）。Capacitor 化時は Preferences に差し替える
const PREFIX = 'anypay:';

export function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // private mode 等では無視
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
