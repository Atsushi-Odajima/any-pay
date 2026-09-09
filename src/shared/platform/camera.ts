// QR スキャン。BarcodeDetector が使える環境（Android Chrome / iOS 17+ Safari）は優先し、
// それ以外は @zxing/browser でデコードする。Capacitor 化時は本ファイルのみ差し替える。
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';

export interface ScanSession {
  stop(): void;
}

type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * 背面カメラで QR を読み取り、最初に見つかった値を onResult に渡す。
 * 呼び出し側は返り値の stop() で必ずカメラを解放すること。
 */
export async function startQrScan(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError?: (error: Error) => void,
): Promise<ScanSession> {
  const Detector = getBarcodeDetector();
  if (Detector) {
    return startWithBarcodeDetector(
      video,
      new Detector({ formats: ['qr_code'] }),
      onResult,
      onError,
    );
  }
  return startWithZxing(video, onResult, onError);
}

async function startWithBarcodeDetector(
  video: HTMLVideoElement,
  detector: BarcodeDetectorLike,
  onResult: (text: string) => void,
  onError?: (error: Error) => void,
): Promise<ScanSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  await video.play();
  let active = true;
  let timer = 0;
  const tick = async () => {
    if (!active) return;
    try {
      if (video.readyState >= 2) {
        const codes = await detector.detect(video);
        const hit = codes.find((c) => c.rawValue);
        if (hit && active) {
          onResult(hit.rawValue);
        }
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
    if (active) timer = window.setTimeout(tick, 150);
  };
  void tick();
  return {
    stop() {
      active = false;
      window.clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

async function startWithZxing(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError?: (error: Error) => void,
): Promise<ScanSession> {
  const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
  let controls: IScannerControls | null = null;
  controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    video,
    (result, err) => {
      if (result) onResult(result.getText());
      else if (err && err.name !== 'NotFoundException') onError?.(err);
    },
  );
  return {
    stop() {
      controls?.stop();
      video.srcObject = null;
    },
  };
}
