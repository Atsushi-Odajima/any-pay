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
import { useT } from '@/shared/i18n';
import { usePinStatus } from '../hooks';
import { useSecurityStore } from '../store';

export function SecurityPage() {
  const t = useT();
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
      toast.info(t('security.bioOff'));
      return;
    }
    if (!userId) return;
    const ok =
      isBiometricsEnrolled() ||
      (await enrollBiometrics(userId, profile.data?.display_name ?? 'Any Pay'));
    if (!ok) {
      toast.error(t('security.bioEnrollFailed'));
      return;
    }
    setBiometricsEnabled(true);
    toast.success(t('security.bioOn'));
  };

  return (
    <>
      <PageHeader title={t('security.title')} back="/more" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <Card className="p-0">
          <ListRow
            icon={<KeyRound className="h-5 w-5" />}
            title={t('security.pin')}
            subtitle={
              pin.data?.has_pin
                ? pin.data.locked_until
                  ? t('security.pinLocked', { time: formatTime(pin.data.locked_until) })
                  : t('security.pinSet')
                : t('security.pinUnset')
            }
            right={
              pin.data?.has_pin ? (
                <Badge tone="success">{t('security.on')}</Badge>
              ) : (
                <Badge>{t('security.off')}</Badge>
              )
            }
            to="/settings/security/pin"
          />
          <ListRow
            icon={<Fingerprint className="h-5 w-5" />}
            title={t('security.biometrics')}
            subtitle={bioAvailable === false ? t('security.bioUnavailable') : t('security.bioSub')}
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
          <p>{t('security.note')}</p>
        </Card>
      </div>
    </>
  );
}
