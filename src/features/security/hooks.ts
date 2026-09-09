import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import { isBiometricsEnrolled, verifyBiometrics } from '@/shared/platform/biometrics';
import { fetchPinStatus, setPin, verifyPin } from './api';
import { tr } from '@/shared/i18n';
import { AUTH_GATE_TTL_MS, useSecurityStore } from './store';

export const securityKeys = {
  pin: (userId: string | undefined) => ['pin-status', userId] as const,
};

export function usePinStatus() {
  const { userId } = useSession();
  return useQuery({
    queryKey: securityKeys.pin(userId),
    queryFn: fetchPinStatus,
    enabled: !!userId,
    staleTime: 10_000,
  });
}

export function useSetPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pin, currentPin }: { pin: string; currentPin?: string }) =>
      setPin(pin, currentPin),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pin-status'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useVerifyPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyPin,
    onSettled: () => qc.invalidateQueries({ queryKey: ['pin-status'] }),
  });
}

export type GateStep = 'idle' | 'biometrics' | 'pin';

/**
 * 決済前の本人確認ゲート。
 *  1. 生体認証 ON（端末に登録済み）なら WebAuthn で再認証（クライアント側ゲート。5分有効）
 *  2. PIN 設定済みでサーバー側の verify が 5 分以上前なら PIN 入力（サーバーが PIN_REQUIRED で拒否するため必須）
 * すべて通過したら onPass を呼ぶ。
 */
export function useAuthGate() {
  const { userId } = useSession();
  const pin = usePinStatus();
  const biometricsEnabled = useSecurityStore((s) => s.biometricsEnabled);
  const biometricVerifiedAt = useSecurityStore((s) => s.biometricVerifiedAt);
  const markBiometricVerified = useSecurityStore((s) => s.markBiometricVerified);
  const qc = useQueryClient();
  const [step, setStep] = useState<GateStep>('idle');
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);

  const needsPin = useCallback(async () => {
    const status = await qc.fetchQuery({
      queryKey: securityKeys.pin(userId),
      queryFn: fetchPinStatus,
      staleTime: 0,
    });
    return status.has_pin && !status.verified;
  }, [qc, userId]);

  const run = useCallback(
    async (onPass: () => void) => {
      const bioFresh =
        biometricVerifiedAt !== null && Date.now() - biometricVerifiedAt < AUTH_GATE_TTL_MS;
      if (biometricsEnabled && isBiometricsEnrolled() && !bioFresh) {
        setStep('biometrics');
        setBioError(null);
        const ok = await verifyBiometrics();
        if (!ok) {
          setBioError(tr('security.bioFailed'));
          setStep('idle');
          return;
        }
        markBiometricVerified();
      }
      if (await needsPin()) {
        setPending(() => onPass);
        setStep('pin');
        return;
      }
      setStep('idle');
      onPass();
    },
    [biometricsEnabled, biometricVerifiedAt, markBiometricVerified, needsPin],
  );

  const onPinVerified = useCallback(() => {
    setStep('idle');
    const fn = pending;
    setPending(null);
    fn?.();
  }, [pending]);

  const cancel = useCallback(() => {
    setStep('idle');
    setPending(null);
  }, []);

  return { run, step, onPinVerified, cancel, bioError, hasPin: pin.data?.has_pin ?? false };
}
