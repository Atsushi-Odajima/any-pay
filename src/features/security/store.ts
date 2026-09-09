import { create } from 'zustand';
import { getItem, setItem } from '@/shared/platform/storage';

const BIO_KEY = 'biometrics_enabled';

interface SecurityState {
  biometricsEnabled: boolean;
  setBiometricsEnabled: (v: boolean) => void;
  /** 端末側で生体認証を通した時刻（ms）。5分有効 */
  biometricVerifiedAt: number | null;
  markBiometricVerified: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  biometricsEnabled: getItem(BIO_KEY) === '1',
  setBiometricsEnabled: (v) => {
    setItem(BIO_KEY, v ? '1' : '0');
    set({ biometricsEnabled: v });
  },
  biometricVerifiedAt: null,
  markBiometricVerified: () => set({ biometricVerifiedAt: Date.now() }),
}));

export const AUTH_GATE_TTL_MS = 5 * 60 * 1000;
