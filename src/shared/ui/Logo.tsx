import { cn } from '@/shared/lib/cn';

/**
 * Any Pay のロゴマーク：APY モノグラム + 青い丸。
 * オレンジのグラデーション角丸四角に、直立・幅広（縦横比 1:1）で均一な字間の白い「A」「P」「Y」
 * （均一ストローク・切り落とし端・尖った結合）を中央に置き、その下に青（#2F6BFF）の丸を印章のように配置する。
 * public/favicon.svg / PWA アイコンと同じ図形。`onLight` は白地に置く版（文字がオレンジ、背景なし）
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
      <g fill="none" stroke={letter} strokeWidth="6.8" strokeLinecap="butt" strokeLinejoin="miter">
        <path d="M7 55 L19.5 30 L32 55 M12 46.5 H27" />
        <path d="M40 55 V30 H53.75 a6.25 6.25 0 0 1 0 12.5 H40" />
        <path d="M68 30 L80.5 43.75 L93 30 M80.5 43.75 V55" />
      </g>
      <circle cx="50" cy="75" r="8" fill="#2f6bff" />
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
