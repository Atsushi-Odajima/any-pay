import { Copy, Share2 } from 'lucide-react';
import { useMyProfile } from '@/features/auth/hooks';
import { QrCode } from '@/features/qr/components/QrCode';
import { buildPayload, buildScanUrl } from '@/features/qr/payload';
import { Button, PageHeader, PageLoading, toast } from '@/shared/ui';
import { copyText, shareText } from '@/shared/platform/clipboard';
import { currentOrigin } from '@/shared/platform/print';

export function ReceivePage() {
  const profile = useMyProfile();
  if (profile.isPending || !profile.data) return <PageLoading />;
  const handle = profile.data.handle;
  const payload = buildPayload({ kind: 'receive', handle });
  const url = buildScanUrl(currentOrigin(), { kind: 'receive', handle });

  return (
    <>
      <PageHeader title="受け取る" back="/send" />
      <div className="flex flex-col items-center gap-5 px-4 pb-6 pt-4">
        <p className="text-sm text-mist">このQRを相手に読み取ってもらうと送金画面が開きます</p>
        <QrCode value={payload} size={220} label="受取用QRコード" />
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
              toast[ok ? 'success' : 'error'](
                ok ? 'ID をコピーしました' : 'コピーできませんでした',
              );
            }}
          >
            ID をコピー
          </Button>
          <Button
            variant="secondary"
            full
            icon={<Share2 className="h-4 w-4" />}
            onClick={async () => {
              const ok = await shareText({
                title: 'Any Pay で送金',
                text: `Any Pay で @${handle} に送金`,
                url,
              });
              if (!ok) {
                const copied = await copyText(url);
                toast[copied ? 'success' : 'error'](
                  copied ? 'リンクをコピーしました' : '共有できませんでした',
                );
              }
            }}
          >
            リンクを共有
          </Button>
        </div>
      </div>
    </>
  );
}
