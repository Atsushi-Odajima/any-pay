import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markRead,
  type Notification,
} from './api';
import { subscribeNotifications } from './realtime';

export const notificationKeys = {
  list: (userId: string | undefined) => ['notifications', userId] as const,
  unread: (userId: string | undefined) => ['notifications-unread', userId] as const,
};

export function useNotifications() {
  const { userId } = useSession();
  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: () => fetchNotifications(userId as string),
    enabled: !!userId,
  });
}

export function useUnreadCount() {
  const { userId } = useSession();
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: () => fetchUnreadCount(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMarkAllRead() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllRead(userId as string),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

/** 本人宛て通知の Realtime ストリーム。handler は最新のものが呼ばれる */
export function useNotificationStream(handler?: (n: Notification) => void) {
  const { userId } = useSession();
  const qc = useQueryClient();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    if (!userId) return;
    return subscribeNotifications(userId, (n) => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      ref.current?.(n);
    });
  }, [userId, qc]);
}
