import { cn } from '@/shared/lib/cn';

/**
 * Any Pay のロゴマーク：APY モノグラム + 青い丸。
 * オレンジのグラデーション角丸四角に、8° 前傾した白い「A」「P」「Y」（均一ストローク・丸い端）と、
 * 右下に青（#2F6BFF）の丸をピリオドとして置く。public/favicon.svg / PWA アイコンと同じ図形。
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
        transform="skewX(-8) translate(8 0)"
        fill="none"
        stroke={letter}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 72 L22 30 L33 72 M15.5 57 H28.5" />
        <path d="M41 72 V30 H49 a10.5 10.5 0 0 1 0 21 H41" />
        <path d="M61 30 L71.5 50 L82 30 M71.5 50 V72" />
      </g>
      <circle cx="91" cy="68" r="8" fill="#2f6bff" />
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
