import { toast } from '@/shared/ui';
import { vibrate } from '@/shared/platform/haptics';
import { useNotificationStream } from './hooks';

/** ログイン中は常時購読し、届いた通知をトーストで表示する */
export function NotificationListener() {
  useNotificationStream((n) => {
    // 支払い完了は PayPage が完了画面へ遷移させるためトーストは出さない
    if (n.type === 'payment_sent') return;
    vibrate('light');
    toast.info(n.title);
  });
  return null;
}
