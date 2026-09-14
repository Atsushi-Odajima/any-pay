import { cn } from '@/shared/lib/cn';

/**
 * Any Pay のロゴマーク。オレンジのスクワークル（角丸四角）に、幾何学的な小文字 "a"
 * （円形のボウル + 右のステム）。カウンター（穴）を角丸の四角にして QR のモジュールを暗示する。
 * public/favicon.svg / icons と同じ図形
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Any Pay"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="ap-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff5a0f" />
        </linearGradient>
        <mask id="ap-logo-m">
          <rect width="100" height="100" fill="#fff" />
          <rect x="33" y="42" width="26" height="26" rx="8" fill="#000" />
        </mask>
      </defs>
      <rect width="100" height="100" rx="26" fill="url(#ap-logo-g)" />
      <g fill="#fff" mask="url(#ap-logo-m)">
        <circle cx="46" cy="55" r="26.5" />
        <rect x="61.5" y="28.5" width="11" height="53" rx="5.5" />
      </g>
    </svg>
  );
}

/** ロゴマーク + ワードマーク（"Any Pay"。Pay をブランド色に） */
export function Logo({
  size = 32,
  wordmark = true,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
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
