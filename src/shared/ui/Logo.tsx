import { cn } from '@/shared/lib/cn';

/**
 * Any Pay のロゴマーク：AP モノグラム + 青いピリオド。
 * オレンジのグラデーション角丸四角に白い「A」「P」（丸いストローク）、右下に青（#2F6BFF）の丸を
 * ピリオドとして置いてアクセントにする。public/favicon.svg / PWA アイコンと同じ図形。
 * `onLight` は白地に置く版（文字がオレンジ、背景なし）
 */
export function LogoMark({
  size = 40,
  onLight = false,
  className,
}: {
  size?: number;
  onLight?: boolean;
  className?: string;
}) {
  const letter = onLight ? '#ff6b1a' : '#ffffff';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Any Pay"
      className={cn('shrink-0', className)}
    >
      {!onLight && (
        <>
          <defs>
            <linearGradient id="ap-logo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff8a3d" />
              <stop offset="1" stopColor="#ff5a0f" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="26" fill="url(#ap-logo-g)" />
        </>
      )}
      <g
        transform="translate(-4 0)"
        fill="none"
        stroke={letter}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 76 L38 27 L57 76 M27 59 H49" />
        <path d="M66 76 V26 H72 a13 13 0 0 1 0 26 H66" />
      </g>
      <circle cx="89" cy="70" r="6.5" fill="#2f6bff" />
    </svg>
  );
}

/** ロゴマーク + ワードマーク（"Any Pay"。Pay をブランド色に） */
export function Logo({
  size = 32,
  wordmark = true,
  onLight = false,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  onLight?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} onLight={onLight} />
      {wordmark && (
        <span
          className="font-bold tracking-tight text-fg"
          style={{ fontSize: Math.round(size * 0.62), lineHeight: 1 }}
        >
          Any <span className="text-brand">Pay</span>
        </span>
      )}
    </span>
  );
}
