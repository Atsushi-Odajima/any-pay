import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import { isCameraSupported, startQrScan } from '@/shared/platform/camera';
import { vibrate } from '@/shared/platform/haptics';
import { Button, Input } from '@/shared/ui';

interface Props {
  onResult: (text: string) => void;
  /** 同じ値を連続で通知しない（既定 true） */
  once?: boolean;
  paused?: boolean;
}

/** 背面カメラで QR を読み取る。カメラが使えない環境では手入力にフォールバック */
export function QrScanner({ onResult, once = true, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const handled = useRef(false);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  const supported = isCameraSupported();

  useEffect(() => {
    handled.current = false;
    if (!supported || paused) return;
    const video = videoRef.current;
    if (!video) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    startQrScan(
      video,
      (text) => {
        if (once && handled.current) return;
        handled.current = true;
        vibrate('light');
        onResultRef.current(text);
      },
      () => undefined,
    )
      .then((session) => {
        if (cancelled) session.stop();
        else stop = session.stop;
      })
      .catch((e: unknown) => {
        const name = e instanceof Error ? e.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'カメラの使用が許可されていません。ブラウザの設定から許可してください'
            : 'カメラを起動できませんでした',
        );
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [supported, paused, once]);

  if (!supported || error) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-ink-800 p-4">
        <div className="flex items-center gap-2 text-sm text-mist">
          <CameraOff className="h-4 w-4" />
          {error ?? 'この環境ではカメラを使えません'}
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) onResultRef.current(manual.trim());
          }}
        >
          <Input
            label="QRの内容を貼り付け（デモ用）"
            placeholder="ap1:..."
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            読み取る
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[62%] w-[62%] rounded-2xl border-2 border-lime/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      </div>
    </div>
  );
}
