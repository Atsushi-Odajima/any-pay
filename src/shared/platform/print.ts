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
