import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/shared/ui';
import { queryClient } from '@/shared/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <ToastContainer />
    </QueryClientProvider>
  );
}
