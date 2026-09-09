import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui';
import { useT } from '@/shared/i18n';

export function QrCode({
  value,
  size = 240,
  className,
  label,
}: {
  value: string | null | undefined;
  size?: number;
  className?: string;
  label?: string;
}) {
  // value ごとの生成結果を保持し、value が変わったら古い画像は表示しない
  const t = useT();
  const [rendered, setRendered] = useState<{ value: string; src: string } | null>(null);
  useEffect(() => {
    if (!value) return;
    let active = true;
    void QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 2,
      color: { dark: '#0a0a0aff', light: '#ffffffff' },
    }).then((url) => {
      if (active) setRendered({ value, src: url });
    });
    return () => {
      active = false;
    };
  }, [value, size]);
  const src = value && rendered?.value === value ? rendered.src : null;

  return (
    <div
      className={cn('flex items-center justify-center rounded-3xl bg-white p-4', className)}
      style={
        className?.includes('p-0')
          ? { width: size, height: size }
          : { width: size + 32, height: size + 32 }
      }
    >
      {src ? (
        <img
          src={src}
          width={size}
          height={size}
          alt={label ?? t('pay.qrLabel')}
          className="block"
        />
      ) : (
        <Skeleton className="h-full w-full bg-neutral-200" />
      )}
    </div>
  );
}
