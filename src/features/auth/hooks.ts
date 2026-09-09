import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './store';
import {
  createProfile,
  fetchMyProfile,
  isHandleAvailable,
  sendOtp,
  signInWithPassword,
  signOut,
  updateProfile,
  verifyOtp,
} from './api';

export const authKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
};

export function useSession() {
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  return { status, session, userId: session?.user.id };
}

export function useMyProfile() {
  const { userId } = useSession();
  return useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: () => fetchMyProfile(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useSendOtp() {
  return useMutation({ mutationFn: (phone: string) => sendOtp(phone) });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ phone, token }: { phone: string; token: string }) => verifyOtp(phone, token),
  });
}

export function useSignInWithPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      signInWithPassword(id, password),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => qc.clear(),
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  const { userId } = useSession();
  return useMutation({
    mutationFn: async (input: { handle: string; display_name: string }) => {
      if (!userId) throw new Error('NOT_AUTHENTICATED');
      await createProfile({ id: userId, ...input });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.profile(userId) }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { userId } = useSession();
  return useMutation({
    mutationFn: async (patch: { handle?: string; display_name?: string }) => {
      if (!userId) throw new Error('NOT_AUTHENTICATED');
      await updateProfile(userId, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.profile(userId) }),
  });
}

export function useHandleAvailability() {
  return useMutation({ mutationFn: (handle: string) => isHandleAvailable(handle) });
}
