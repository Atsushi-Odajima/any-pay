export function printPage(): void {
  window.print();
}

export function reloadPage(): void {
  window.location.reload();
}

export function currentOrigin(): string {
  return window.location.origin;
}

export function isStandaloneDisplay(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/** 外部 URL へ遷移（Stripe Checkout など）。Capacitor 化時は Browser plugin に差し替える */
export function navigateExternal(url: string): void {
  window.location.assign(url);
}
