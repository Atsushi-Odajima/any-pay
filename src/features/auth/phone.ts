/** 日本の電話番号入力を E.164（+81…）へ正規化する。すでに + 始まりならそのまま */
export function normalizePhone(input: string): string | null {
  const s = input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^\d+]/g, '');
  if (s === '') return null;
  if (s.startsWith('+')) {
    return /^\+\d{8,15}$/.test(s) ? s : null;
  }
  if (s.startsWith('0') && /^0\d{9,10}$/.test(s)) {
    return `+81${s.slice(1)}`;
  }
  return null;
}

/** +819012345678 -> 090-1234-5678（表示用） */
export function formatPhoneForDisplay(e164: string): string {
  if (!e164.startsWith('+81')) return e164;
  const local = `0${e164.slice(3)}`;
  if (local.length === 11) return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
  return local;
}
