import { useState } from 'react';
import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { Button, ErrorMessage, Sheet } from '@/shared/ui';
import { toUserMessage } from '@/shared/lib/errors';
import { vibrate } from '@/shared/platform/haptics';
import { formatTime } from '@/shared/lib/date';
import { useVerifyPin } from '../hooks';
import { PinDots, PinPad } from './PinPad';

/** PIN 入力シート。verify_pin 成功で onVerified */
export function PinGate({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const verify = useVerifyPin();

  const submit = (v: string) => {
    if (v.length < 4) return;
    verify.mutate(v, {
      onSuccess: (r) => {
        setPin('');
        if (r.ok) {
          vibrate('light');
          setMessage(null);
          onVerified();
          return;
        }
        vibrate('error');
        setMessage(
          r.locked_until
            ? `5回連続で失敗したため ${formatTime(r.locked_until)} までロックされます`
            : `PINが違います（あと ${r.remaining} 回）`,
        );
      },
      onError: (e) => {
        setPin('');
        vibrate('error');
        setMessage(toUserMessage(e));
      },
    });
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        setPin('');
        setMessage(null);
        onClose();
      }}
      title="PIN を入力"
    >
      <div className="flex flex-col gap-5">
        <p className="flex items-center justify-center gap-1 text-sm text-mist">
          <Lock className="h-4 w-4" /> 本人確認のため PIN を入力してください
        </p>
        <PinDots length={pin.length} />
        {message && <p className="text-center text-sm text-danger">{message}</p>}
        <ErrorMessage error={verify.isError && !message ? verify.error : null} />
        <PinPad value={pin} onChange={setPin} disabled={verify.isPending} onComplete={submit} />
        <Button
          full
          loading={verify.isPending}
          disabled={pin.length < 4}
          onClick={() => submit(pin)}
        >
          確認
        </Button>
        <Link to="/settings/security" className="text-center text-xs text-mist underline">
          PIN を忘れた場合
        </Link>
      </div>
    </Sheet>
  );
}
