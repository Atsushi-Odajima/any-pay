import { Printer } from 'lucide-react';
import { QrCode } from '@/features/qr/components/QrCode';
import { buildScanUrl } from '@/features/qr/payload';
import { Button } from '@/shared/ui';
import { currentOrigin, printPage } from '@/shared/platform/print';
import { useT } from '@/shared/i18n';
import { useMerchantContext } from '../hooks';

/** 静的QR（印刷用・A4想定）。カメラアプリで読むと /scan → 決済確認へ */
export function MerchantStaticQrPage() {
  const t = useT();
  const { merchant } = useMerchantContext();
  const url = buildScanUrl(currentOrigin(), { kind: 'static_merchant', merchantId: merchant.id });
  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <p className="text-sm text-mist no-print">{t('merchant.qr.lead')}</p>
      <Button className="no-print" icon={<Printer className="h-4 w-4" />} onClick={printPage}>
        {t('merchant.qr.print')}
      </Button>

      <div className="print-sheet mx-auto flex w-full flex-col items-center gap-6 rounded-3xl bg-white px-6 py-10 text-center text-ink">
        <p className="text-xs tracking-[0.3em] text-neutral-500">ANY PAY</p>
        <h1 className="text-3xl font-bold">{merchant.name}</h1>
        {merchant.category && <p className="-mt-4 text-sm text-neutral-500">{merchant.category}</p>}
        <QrCode
          value={url}
          size={260}
          className="border border-neutral-200"
          label={t('merchant.qr.qrLabel', { name: merchant.name })}
        />
        <div className="text-sm text-neutral-700">
          <p className="text-lg font-semibold">{t('merchant.qr.hint')}</p>
          <p className="mt-1">{t('merchant.qr.hintSub')}</p>
        </div>
        <p className="mt-4 text-[10px] text-neutral-400 break-all">{url}</p>
      </div>
    </div>
  );
}
