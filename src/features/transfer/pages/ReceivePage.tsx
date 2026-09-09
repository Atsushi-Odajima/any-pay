import { Copy, Share2 } from 'lucide-react';
import { useMyProfile } from '@/features/auth/hooks';
import { QrCode } from '@/features/qr/components/QrCode';
import { buildPayload, buildScanUrl } from '@/features/qr/payload';
import { Button, PageHeader, PageLoading, toast } from '@/shared/ui';
import { copyText, shareText } from '@/shared/platform/clipboard';
import { currentOrigin } from '@/shared/platform/print';
import { useT } from '@/shared/i18n';

export function ReceivePage() {
  const t = useT();
  const profile = useMyProfile();
  if (profile.isPending || !profile.data) return <PageLoading />;
  const handle = profile.data.handle;
  const payload = buildPayload({ kind: 'receive', handle });
  const url = buildScanUrl(currentOrigin(), { kind: 'receive', handle });

  return (
    <>
      <PageHeader title={t('receive.title')} back="/send" />
      <div className="flex flex-col items-center gap-5 px-4 pb-6 pt-4">
        <p className="text-sm text-mist">{t('receive.hint')}</p>
        <QrCode value={payload} size={220} label={t('receive.qrLabel')} />
        <div className="text-center">
          <p className="text-lg font-semibold">{profile.data.display_name}</p>
          <p className="font-mono text-mist">@{handle}</p>
        </div>
        <div className="flex w-full gap-3">
          <Button
            variant="secondary"
            full
            icon={<Copy className="h-4 w-4" />}
            onClick={async () => {
              const ok = await copyText(`@${handle}`);
              toast[ok ? 'success' : 'error'](ok ? t('receive.copied') : t('receive.copyFailed'));
            }}
          >
            {t('receive.copyId')}
          </Button>
          <Button
            variant="secondary"
            full
            icon={<Share2 className="h-4 w-4" />}
            onClick={async () => {
              const ok = await shareText({
                title: t('receive.shareTitle'),
                text: t('receive.shareText', { handle }),
                url,
              });
              if (!ok) {
                const copied = await copyText(url);
                toast[copied ? 'success' : 'error'](
                  copied ? t('receive.linkCopied') : t('receive.shareFailed'),
                );
              }
            }}
          >
            {t('receive.shareLink')}
          </Button>
        </div>
      </div>
    </>
  );
}
