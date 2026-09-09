import { useEffect, useState } from 'react';
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { useMyProfile, useSession } from '@/features/auth/hooks';
import { Badge, Card, ListRow, PageHeader, toast } from '@/shared/ui';
import { formatTime } from '@/shared/lib/date';
import {
  disableBiometrics,
  enrollBiometrics,
  isBiometricsEnrolled,
  isPlatformAuthenticatorAvailable,
} from '@/shared/platform/biometrics';
import { usePinStatus } from '../hooks';
import { useSecurityStore } from '../store';

export function SecurityPage() {
  const { userId } = useSession();
  const profile = useMyProfile();
  const pin = usePinStatus();
  const biometricsEnabled = useSecurityStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled = useSecurityStore((s) => s.setBiometricsEnabled);
  const [bioAvailable, setBioAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void isPlatformAuthenticatorAvailable().then((v) => {
      if (active) setBioAvailable(v);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleBiometrics = async () => {
    if (biometricsEnabled) {
      disableBiometrics();
      setBiometricsEnabled(false);
      toast.info('生体認証をオフにしました');
      return;
    }
    if (!userId) return;
    const ok =
      isBiometricsEnrolled() ||
      (await enrollBiometrics(userId, profile.data?.display_name ?? 'Any Pay'));
    if (!ok) {
      toast.error('生体認証の登録に失敗しました');
      return;
    }
    setBiometricsEnabled(true);
    toast.success('生体認証をオンにしました');
  };

  return (
    <>
      <PageHeader title="セキュリティ" back="/more" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <Card className="p-0">
          <ListRow
            icon={<KeyRound className="h-5 w-5" />}
            title="決済用 PIN"
            subtitle={
              pin.data?.has_pin
                ? pin.data.locked_until
                  ? `ロック中（${formatTime(pin.data.locked_until)} まで）`
                  : '設定済み・決済と送金の前に確認します'
                : '未設定・設定すると決済前に本人確認を行います'
            }
            right={pin.data?.has_pin ? <Badge tone="success">ON</Badge> : <Badge>OFF</Badge>}
            to="/settings/security/pin"
          />
          <ListRow
            icon={<Fingerprint className="h-5 w-5" />}
            title="生体認証（Face ID / Touch ID）"
            subtitle={
              bioAvailable === false
                ? 'この端末では利用できません'
                : '端末側の再認証ゲート。サーバー側の認可には使いません'
            }
            right={
              <button
                type="button"
                role="switch"
                aria-checked={biometricsEnabled}
                disabled={bioAvailable === false}
                onClick={toggleBiometrics}
                className={`relative h-7 w-12 rounded-full transition-colors ${biometricsEnabled ? 'bg-lime' : 'bg-ink-500'} disabled:opacity-40`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${biometricsEnabled ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            }
            chevron={false}
          />
        </Card>
        <Card className="flex gap-3 text-xs text-mist">
          <ShieldCheck className="h-5 w-5 shrink-0 text-lime" />
          <p>
            PIN はサーバーでハッシュ照合され、決済・送金 RPC
            は直近5分以内の照合を要求します（サーバー側ゲート）。生体認証は WebAuthn
            による端末ローカルの再認証で、サーバーの認可には関与しません。
          </p>
        </Card>
      </div>
    </>
  );
}
