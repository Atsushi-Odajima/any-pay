import { Printer } from 'lucide-react';
import { QrCode } from '@/features/qr/components/QrCode';
import { buildScanUrl } from '@/features/qr/payload';
import { Button } from '@/shared/ui';
import { currentOrigin, printPage } from '@/shared/platform/print';
import { useMerchantContext } from '../hooks';

/** 静的QR（印刷用・A4想定）。カメラアプリで読むと /scan → 決済確認へ */
export function MerchantStaticQrPage() {
  const { merchant } = useMerchantContext();
  const url = buildScanUrl(currentOrigin(), { kind: 'static_merchant', merchantId: merchant.id });
  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <p className="text-sm text-mist no-print">
        レジに置く印刷用QRです。お客様がカメラまたは Any Pay
        のスキャンで読み取り、金額を入力して支払います。
      </p>
      <Button className="no-print" icon={<Printer className="h-4 w-4" />} onClick={printPage}>
        印刷する（A4）
      </Button>

      <div className="print-sheet mx-auto flex w-full flex-col items-center gap-6 rounded-3xl bg-white px-6 py-10 text-center text-ink">
        <p className="text-xs tracking-[0.3em] text-neutral-500">ANY PAY</p>
        <h1 className="text-3xl font-bold">{merchant.name}</h1>
        {merchant.category && <p className="-mt-4 text-sm text-neutral-500">{merchant.category}</p>}
        <QrCode
          value={url}
          size={260}
          className="border border-neutral-200"
          label={`${merchant.name} の決済用QR`}
        />
        <div className="text-sm text-neutral-700">
          <p className="text-lg font-semibold">QRを読み取って金額を入力</p>
          <p className="mt-1">
            スマホのカメラ、または Any Pay アプリの「スキャンする」で読み取ってください
          </p>
        </div>
        <p className="mt-4 text-[10px] text-neutral-400 break-all">{url}</p>
      </div>
    </div>
  );
}
