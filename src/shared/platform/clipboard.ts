export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareText(data: {
  title?: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  try {
    if (typeof navigator.share !== 'function') return false;
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}
