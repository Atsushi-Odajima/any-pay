import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ErrorMessage, PageHeader, toast } from '@/shared/ui';
import { vibrate } from '@/shared/platform/haptics';
import { usePinStatus, useSetPin } from '../hooks';
import { PinDots, PinPad } from '../components/PinPad';

type Step = 'current' | 'new' | 'confirm';

export function PinSetupPage() {
  const navigate = useNavigate();
  const status = usePinStatus();
  const setPin = useSetPin();
  const hasPin = status.data?.has_pin ?? false;
  const [step, setStep] = useState<Step>(hasPin ? 'current' : 'new');
  const [current, setCurrent] = useState('');
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [mismatch, setMismatch] = useState(false);

  // has_pin の取得完了後にステップを合わせる
  const effectiveStep: Step = status.isPending
    ? 'new'
    : step === 'current' && !hasPin
      ? 'new'
      : hasPin && step === 'new' && !current
        ? 'current'
        : step;

  const title =
    effectiveStep === 'current'
      ? '現在の PIN を入力'
      : effectiveStep === 'new'
        ? '新しい PIN を入力（4〜6桁）'
        : 'もう一度入力';

  const next = (v: string) => {
    if (effectiveStep === 'current') {
      setCurrent(v);
      setValue('');
      setStep('new');
      return;
    }
    if (effectiveStep === 'new') {
      setFirst(v);
      setValue('');
      setStep('confirm');
      return;
    }
    if (v !== first) {
      setMismatch(true);
      vibrate('error');
      setValue('');
      setStep('new');
      setFirst('');
      return;
    }
    setPin.mutate(
      { pin: v, currentPin: hasPin ? current : undefined },
      {
        onSuccess: () => {
          toast.success(hasPin ? 'PIN を変更しました' : 'PIN を設定しました');
          navigate('/settings/security', { replace: true });
        },
        onError: () => {
          vibrate('error');
          setValue('');
          setFirst('');
          setCurrent('');
          setStep(hasPin ? 'current' : 'new');
        },
      },
    );
  };

  return (
    <>
      <PageHeader title={hasPin ? 'PIN を変更' : 'PIN を設定'} back="/settings/security" />
      <div className="flex flex-col gap-6 px-4 pb-6 pt-4">
        <p className="text-center text-sm text-mist">{title}</p>
        <PinDots length={value.length} />
        {mismatch && (
          <p className="text-center text-sm text-danger">
            PIN が一致しません。もう一度設定してください
          </p>
        )}
        <ErrorMessage error={setPin.error} />
        <PinPad
          value={value}
          onChange={(v) => {
            setMismatch(false);
            setValue(v);
          }}
          disabled={setPin.isPending}
          onComplete={(v) => next(v)}
        />
        <Button
          full
          disabled={value.length < 4}
          loading={setPin.isPending}
          onClick={() => next(value)}
        >
          {effectiveStep === 'confirm' ? '設定する' : '次へ'}
        </Button>
        <p className="text-xs text-ink-400">
          PIN はサーバー側で bcrypt
          ハッシュとして保存され、5回連続で間違えると10分間ロックされます。PIN
          設定後は、決済・送金の直前に PIN（5分間有効）の入力が必要になります。
        </p>
      </div>
    </>
  );
}
