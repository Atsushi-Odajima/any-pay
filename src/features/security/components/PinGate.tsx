import { useState } from 'react';
import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { Button, ErrorMessage, Sheet } from '@/shared/ui';
import { toUserMessage } from '@/shared/lib/errors';
import { vibrate } from '@/shared/platform/haptics';
import { formatTime } from '@/shared/lib/date';
import { useT } from '@/shared/i18n';
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
  const t = useT();
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
            ? t('security.gate.locked', { time: formatTime(r.locked_until) })
            : t('security.gate.wrong', { n: r.remaining }),
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
      title={t('security.gate.title')}
    >
      <div className="flex flex-col gap-5">
        <p className="flex items-center justify-center gap-1 text-sm text-mist">
          <Lock className="h-4 w-4" /> {t('security.gate.lead')}
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
          {t('security.gate.confirm')}
        </Button>
        <Link to="/settings/security" className="text-center text-xs text-mist underline">
          {t('security.gate.forgot')}
        </Link>
      </div>
    </Sheet>
  );
}
