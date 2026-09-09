import { create } from 'zustand';
import type { Session } from './api';

type Status = 'loading' | 'signed_out' | 'signed_in';

interface AuthState {
  status: Status;
  session: Session | null;
  setSession: (session: Session | null) => void;
}

/** 認証セッション（UI 状態）。更新は AuthProvider からのみ */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  setSession: (session) => set({ session, status: session ? 'signed_in' : 'signed_out' }),
}));
