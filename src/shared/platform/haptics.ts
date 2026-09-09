// 触覚フィードバック。Web は navigator.vibrate、Capacitor 化時は @capacitor/haptics に差し替える
export type HapticPattern = 'light' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 12,
  success: [30, 40, 60],
  error: [60, 40, 60, 40, 60],
};

export function vibrate(pattern: HapticPattern): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    // 非対応環境では無視
  }
}
