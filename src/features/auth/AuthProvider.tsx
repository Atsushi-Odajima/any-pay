import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from './store';
import { getSession, onAuthStateChange } from './api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  useEffect(() => {
    let active = true;
    void getSession()
      .then((s) => {
        if (active) setSession(s);
      })
      .catch(() => {
        if (active) setSession(null);
      });
    const unsubscribe = onAuthStateChange((s) => setSession(s));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSession]);
  return children;
}
